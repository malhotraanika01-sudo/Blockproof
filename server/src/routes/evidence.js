import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { NotFound, Forbidden } from '../utils/errors.js';
import { verifyEvidence, openEvidence } from '../services/evidence.js';
import { audit } from '../services/audit.js';

const router = Router();
router.use(verifyJWT);

/** Evidence is visible to Head, or to the investigator holding the case. */
async function loadAuthorizedEvidence(req) {
  const evidenceId = Number(req.params.id);
  const evidence = await prisma.evidence.findUnique({
    where: { evidenceId },
    include: { evidenceType: true, report: { select: { trackingCode: true, crimeType: true } }, case: { select: { caseNumber: true } } },
  });
  if (!evidence) throw NotFound('Evidence not found');

  if (req.auth.role === 'HEAD') return evidence;
  if (req.auth.role === 'INVESTIGATOR') {
    if (!evidence.caseId) throw Forbidden('Evidence not yet part of a case');
    const active = await prisma.caseAssignment.findFirst({
      where: { caseId: evidence.caseId, investigatorId: req.auth.userId, isActive: true },
    });
    if (!active) throw Forbidden('This evidence belongs to a case not assigned to you');
    return evidence;
  }
  // Common User: only their own submissions, metadata only.
  if (evidence.submittedById === req.auth.userId) return evidence;
  throw Forbidden();
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const evidence = await loadAuthorizedEvidence(req);
    const { encIv, encAuthTag, storageKey, ...safe } = evidence;
    res.json(safe);
  }),
);

// Human-readable custody timeline (NOT the raw ledger). Head + assigned Investigator.
router.get(
  '/:id/custody',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (req, res) => {
    const evidence = await loadAuthorizedEvidence(req);
    const [transfers, events] = await Promise.all([
      prisma.evidenceTransfer.findMany({
        where: { evidenceId: evidence.evidenceId },
        orderBy: { initiatedAt: 'asc' },
        include: {
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
          transferredBy: { select: { fullName: true } },
          receivedBy: { select: { fullName: true } },
        },
      }),
      prisma.blockchainTransaction.findMany({
        where: { evidenceId: evidence.evidenceId },
        orderBy: { recordedAt: 'asc' },
        // Investigators get the custody narrative but NOT fabricTxId / block refs.
        select: req.auth.role === 'HEAD'
          ? undefined
          : { eventType: true, recordedAt: true, payload: true },
      }),
    ]);
    res.json({
      evidenceCode: evidence.evidenceCode,
      integrityStatus: evidence.integrityStatus,
      lastVerifiedAt: evidence.lastVerifiedAt,
      transfers,
      timeline: events,
    });
  }),
);

// Download / preview the decrypted original (authorized viewers only).
router.get(
  '/:id/content',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (req, res) => {
    const evidence = await loadAuthorizedEvidence(req);
    const { plaintext } = await openEvidence(evidence.evidenceId);
    await audit({
      actorId: req.auth.userId, action: 'EVIDENCE_OPENED', entityType: 'Evidence',
      entityId: evidence.evidenceId, detail: evidence.evidenceCode, ip: req.ip,
    });
    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${evidence.originalFilename}"`);
    res.send(plaintext);
  }),
);

// Verify integrity — Investigator (assigned) or Head. Returns pass/fail only.
router.post(
  '/:id/verify',
  requirePermission('evidence:verify'),
  asyncHandler(async (req, res) => {
    const evidence = await loadAuthorizedEvidence(req);
    const result = await verifyEvidence(evidence.evidenceId, req.auth.userId);
    res.json(result); // { result: 'VERIFIED' | 'TAMPERED', computedHash, anchoredHash, ... }
  }),
);

export default router;
