import { prisma } from '../db/prisma.js';

/**
 * Application-level audit entry (trigger-written rows cover DB state changes;
 * this covers reads/actions that matter but don't mutate a watched table —
 * e.g. a Head opening the blockchain history, a verification request).
 */
export async function audit({ actorId, action, entityType, entityId, detail, ip }) {
  try {
    await prisma.auditLog.create({
      data: { actorId: actorId ?? null, action, entityType, entityId: entityId ?? null, detail, ipAddress: ip },
    });
  } catch (err) {
    // auditing must never break the request
    console.error('audit write failed:', err.message);
  }
}
