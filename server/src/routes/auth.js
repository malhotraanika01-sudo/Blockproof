import { Router } from 'express';
import argon2 from 'argon2';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken, verifyJWT } from '../middleware/auth.js';
import { BadRequest, Unauthorized } from '../utils/errors.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';
import { audit } from '../services/audit.js';
import { config } from '../config/index.js';
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  refreshCookieOptions,
} from '../services/refreshToken.js';

const router = Router();

function requestMeta(req) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

/** Issue an access token + a fresh rotating-refresh-token cookie for `user`. */
async function startSession(req, res, user) {
  const raw = await issueRefreshToken(user.userId, requestMeta(req));
  res.cookie(config.refreshCookieName, raw, refreshCookieOptions());
  return { accessToken: signToken(user), user: publicUser(user) };
}

// Public self-registration always creates a COMMON_USER. Staff accounts are
// created by a Head via /users.
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const role = await prisma.role.findUnique({ where: { name: 'COMMON_USER' } });
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw BadRequest('That email is already registered');

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: {
        roleId: role.roleId,
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
      },
      include: { role: true },
    });
    await audit({ actorId: user.userId, action: 'USER_REGISTERED', entityType: 'User', entityId: user.userId, ip: req.ip });
    res.status(201).json(await startSession(req, res, user));
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user || !user.isActive) throw Unauthorized('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw Unauthorized('Invalid credentials');
    await audit({ actorId: user.userId, action: 'USER_LOGIN', entityType: 'User', entityId: user.userId, ip: req.ip });
    res.json(await startSession(req, res, user));
  }),
);

// Called silently on app load (and transparently by the frontend's axios
// interceptor after a 401) to turn the httpOnly cookie back into a fresh,
// short-lived access token — the access token itself is kept only in memory
// on the client and never persisted, so a page reload always comes through
// here rather than reading a token out of storage.
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const presented = req.cookies?.[config.refreshCookieName];
    const rotated = await rotateRefreshToken(presented, requestMeta(req));
    if (!rotated) {
      res.clearCookie(config.refreshCookieName, refreshCookieOptions());
      throw Unauthorized('Session expired or invalid');
    }
    res.cookie(config.refreshCookieName, rotated.raw, refreshCookieOptions());

    const user = await prisma.user.findUnique({ where: { userId: rotated.userId }, include: { role: true } });
    if (!user || !user.isActive) {
      res.clearCookie(config.refreshCookieName, refreshCookieOptions());
      throw Unauthorized('Account is inactive');
    }
    res.json({ accessToken: signToken(user), user: publicUser(user) });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.cookies?.[config.refreshCookieName]);
    res.clearCookie(config.refreshCookieName, refreshCookieOptions());
    res.status(204).end();
  }),
);

router.get(
  '/me',
  verifyJWT,
  asyncHandler(async (req, res) => {
    res.json({
      user: publicUser(req.auth.user),
      role: req.auth.role,
      permissions: [...req.auth.permissions],
    });
  }),
);

function publicUser(u) {
  return {
    userId: u.userId,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    badgeNumber: u.badgeNumber,
    role: u.role?.name,
  };
}

export default router;
