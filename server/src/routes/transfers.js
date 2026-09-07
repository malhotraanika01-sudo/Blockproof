import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { transferInitiateSchema, transferCompleteSchema } from '../validation/schemas.js';
import { NotFound, Forbidden } from '../utils/errors.js';
import { ledger } from '../services/ledger/index.js';

const router = Router();
router.use(verifyJWT);

async function assertEvidenceAssigned(req, evidenceId) {
  if (req.auth.role === 'HEAD') return;
  const ev = await prisma.evidence.findUnique({ where: { evidenceId } });
  if (!ev) throw NotFound('Evidence not found');
  if (!ev.caseId) throw Forbidden('Evidence not part of a case');
  const active = await prisma.caseAssignment.findFirst({
    where: { caseId: ev.caseId, investigatorId: req.auth.userId, isActive: true },
  });
  if (!active) throw Forbidden('Not your case');
}

router.get(
  '/',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.evidenceId) where.evidenceId = Number(req.query.evidenceId);
    if (req.auth.role === 'INVESTIGATOR') {
      where.evidence = { case: { assignments: { some: { investigatorId: req.auth.userId, isActive: true } } } };
    }
    const transfers = await prisma.evidenceTransfer.findMany({
      where,
      orderBy: { initiatedAt: 'desc' },
      include: {
        evidence: { select: { evidenceCode: true, originalFilename: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        transferredBy: { select: { fullName: true } },
        receivedBy: { select: { fullName: true } },
      },
    });
    res.json({ items: transfers });
  }),
);

// Initiate a transfer via the transfer_evidence() stored function.
router.post(
  '/',
  requirePermission('evidence:transfer'),
  asyncHandler(async (req, res) => {
    const data = transferInitiateSchema.parse(req.body);
    await assertEvidenceAssigned(req, data.evidenceId);
    const [row] = await prisma.$queryRaw`
      SELECT transfer_evidence(
        ${data.evidenceId}::int, ${data.fromLocationId}::int,
        ${data.toLocationId}::int, ${req.auth.userId}::int, ${data.reason}::varchar
      ) AS transfer_id`;
    res.status(201).json({ transferId: row.transfer_id, status: 'PENDING' });
  }),
);

// Acknowledge / reject a pending transfer. Trigger sets completed_at + audit,
// then we anchor the TRANSFERRED event on the ledger.
router.patch(
  '/:id',
  requirePermission('evidence:transfer'),
  asyncHandler(async (req, res) => {
    const transferId = Number(req.params.id);
    const { status } = transferCompleteSchema.parse(req.body);
    const transfer = await prisma.evidenceTransfer.findUnique({
      where: { transferId },
      include: { evidence: true },
    });
    if (!transfer) throw NotFound('Transfer not found');
    if (transfer.status !== 'PENDING') throw Forbidden('Transfer already resolved');
    await assertEvidenceAssigned(req, transfer.evidenceId);

    const updated = await prisma.evidenceTransfer.update({
      where: { transferId },
      data: { status, receivedById: req.auth.userId },
    });

    if (status === 'COMPLETED') {
      const event = await ledger.transferEvidence(transfer.evidence, {
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        byUserId: req.auth.userId,
      });
      await prisma.evidenceTransfer.update({
        where: { transferId },
        data: { blockchainTxId: event.fabricTxId },
      });
    }
    res.json(updated);
  }),
);

export default router;
