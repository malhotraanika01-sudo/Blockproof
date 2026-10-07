import crypto from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';

/**
 * Rotating refresh-token store.
 *
 * The raw token is a random 48-byte value, handed to the client exactly once
 * (as the httpOnly cookie value) and never stored — only its SHA-256 hash is
 * persisted in `refresh_tokens`. A database read (or dump) therefore cannot
 * produce a token an attacker could replay.
 *
 * Every `/auth/refresh` call rotates: the old row is marked revoked and
 * chained to the new one via `replacedByTokenId`, and a fresh token is
 * issued. If a token that's already been rotated is ever presented again
 * (a strong signal of theft + replay), the whole chain for that user is
 * revoked and the caller is forced to log in again.
 */

const RAW_BYTES = 48;

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function expiryDate() {
  return new Date(Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000);
}

/** Issue a brand-new refresh token for a freshly logged-in user. */
export async function issueRefreshToken(userId, meta = {}) {
  const raw = crypto.randomBytes(RAW_BYTES).toString('hex');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: expiryDate(),
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip?.slice(0, 64),
    },
  });
  return raw;
}

/**
 * Validate + rotate a presented refresh token.
 * Returns { userId, raw } on success, or null if the token is missing,
 * expired, already revoked, or unknown (all treated the same — caller 401s).
 */
export async function rotateRefreshToken(presentedRaw, meta = {}) {
  if (!presentedRaw) return null;
  const tokenHash = hashToken(presentedRaw);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row) return null;

  if (row.revokedAt || row.expiresAt < new Date()) {
    // Reuse of a revoked/expired token is a replay signal — nuke every
    // live token for this user rather than quietly 401-ing just this one.
    await revokeAllForUser(row.userId);
    return null;
  }

  const raw = crypto.randomBytes(RAW_BYTES).toString('hex');
  const next = await prisma.refreshToken.create({
    data: {
      userId: row.userId,
      tokenHash: hashToken(raw),
      expiresAt: expiryDate(),
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip?.slice(0, 64),
    },
  });
  await prisma.refreshToken.update({
    where: { tokenId: row.tokenId },
    data: { revokedAt: new Date(), replacedByTokenId: next.tokenId },
  });

  return { userId: row.userId, raw };
}

/** Logout: revoke the single presented token. No-op if it's already gone. */
export async function revokeRefreshToken(presentedRaw) {
  if (!presentedRaw) return;
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash: hashToken(presentedRaw), revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {});
}

/** "Log out everywhere" / replay-detected — revoke every live token for a user. */
export async function revokeAllForUser(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Cookie attributes shared by every route that sets/clears the refresh cookie. */
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd(),
    // Cross-site in prod (Vercel <-> Render are different origins) needs
    // SameSite=None; same-site in local dev (Vite proxy) uses Lax.
    sameSite: config.isProd() ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
  };
}
