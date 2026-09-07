// Blockchain History — HEAD ONLY.
// Both the UI route and this API route reject Investigator + Common User.
// Enforced twice: requireRole('HEAD') AND requirePermission('blockchain:read').

import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { NotFound } from '../utils/errors.js';
import { ledger } from '../services/ledger/index.js';
import { audit } from '../services/audit.js';

const router = Router();
router.use(verifyJWT, requireRole('HEAD'), requirePermission('blockchain:read'));

// Full ledger feed (paginated), newest first.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Number(req.query.pageSize || 25));
    const where = {};
    if (req.query.eventType) where.eventType = req.query.eventType;
    if (req.query.evidenceCode) where.evidence = { evidenceCode: req.query.evidenceCode };

    const [items, total] = await Promise.all([
      prisma.blockchainTransaction.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { evidence: { select: { evidenceCode: true, originalFilename: true, integrityStatus: true } } },
      }),
      prisma.blockchainTransaction.count({ where }),
    ]);
    await audit({ actorId: req.auth.userId, action: 'BLOCKCHAIN_HISTORY_VIEWED', entityType: 'Ledger', ip: req.ip });
    res.json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 } });
  }),
);

// Per-evidence custody chain, straight from the ledger driver.
router.get(
  '/evidence/:code',
  asyncHandler(async (req, res) => {
    const evidence = await prisma.evidence.findUnique({ where: { evidenceCode: req.params.code } });
    if (!evidence) throw NotFound('Evidence not found');
    const [chain, mirror] = await Promise.all([
      ledger.getEvidenceHistory(evidence),
      prisma.blockchainTransaction.findMany({ where: { evidenceId: evidence.evidenceId }, orderBy: { recordedAt: 'asc' } }),
    ]);
    await audit({
      actorId: req.auth.userId, action: 'BLOCKCHAIN_HISTORY_VIEWED', entityType: 'Evidence',
      entityId: evidence.evidenceId, detail: evidence.evidenceCode, ip: req.ip,
    });
    res.json({
      evidenceCode: evidence.evidenceCode,
      sha256: evidence.sha256Hash,
      integrityStatus: evidence.integrityStatus,
      ledgerDriver: ledger.driver,
      chain, // from Fabric / mock
      mirror, // relational copy in blockchain_transactions
    });
  }),
);

export default router;
