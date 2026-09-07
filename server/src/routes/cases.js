import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { parseListQuery, paginated } from '../utils/query.js';
import { createCaseSchema, assignCaseSchema, caseStatusSchema, updateSchema } from '../validation/schemas.js';
import { NotFound, Forbidden, Conflict } from '../utils/errors.js';
import { audit } from '../services/audit.js';

const router = Router();
router.use(verifyJWT);

/** Investigators only see cases where they hold the active assignment. */
async function assertCaseVisible(req, caseId) {
  if (req.auth.role === 'HEAD') return;
  if (req.auth.role !== 'INVESTIGATOR') throw Forbidden();
  const active = await prisma.caseAssignment.findFirst({
    where: { caseId, investigatorId: req.auth.userId, isActive: true },
  });
  if (!active) throw Forbidden('This case is not assigned to you');
}

// List cases — Head: all; Investigator: assigned only.
router.get(
  '/',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (req, res) => {
    const { skip, take, q, orderBy, page, pageSize } = parseListQuery(req.query, {
      sortable: ['createdAt', 'priority', 'status', 'openedAt'],
      defaultSort: 'openedAt',
    });
    const where = {};
    if (req.auth.role === 'INVESTIGATOR') {
      where.assignments = { some: { investigatorId: req.auth.userId, isActive: true } };
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { caseNumber: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where, skip, take, orderBy,
        include: {
          report: { select: { crimeType: true, trackingCode: true } },
          assignments: {
            where: { isActive: true },
            include: { investigator: { select: { userId: true, fullName: true, badgeNumber: true } } },
          },
          _count: { select: { evidence: true, updates: true } },
        },
      }),
      prisma.case.count({ where }),
    ]);
    res.json(paginated(items, total, { page, pageSize }));
  }),
);

// Head escalates a report into a case.
router.post(
  '/',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const data = createCaseSchema.parse(req.body);
    const report = await prisma.crimeReport.findUnique({ where: { reportId: data.reportId }, include: { case: true } });
    if (!report) throw NotFound('Report not found');
    if (report.case) throw Conflict('That report is already a case', { caseNumber: report.case.caseNumber });

    const seq = (await prisma.case.count()) + 1;
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.case.create({
        data: {
          caseNumber: `CASE-2026-${String(seq).padStart(3, '0')}`,
          reportId: report.reportId,
          leadHeadId: req.auth.userId,
          title: data.title || report.title,
          priority: data.priority,
        },
      });
      await tx.crimeReport.update({ where: { reportId: report.reportId }, data: { status: 'ESCALATED' } });
      await tx.evidence.updateMany({ where: { reportId: report.reportId }, data: { caseId: c.caseId } });
      return c;
    });
    await audit({ actorId: req.auth.userId, action: 'CASE_OPENED', entityType: 'Case', entityId: created.caseId, ip: req.ip });
    res.status(201).json(created);
  }),
);

router.get(
  '/:id',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (req, res) => {
    const caseId = Number(req.params.id);
    await assertCaseVisible(req, caseId);
    const c = await prisma.case.findUnique({
      where: { caseId },
      include: {
        report: { include: { reporter: { select: { fullName: true, email: true } } } },
        leadHead: { select: { fullName: true, badgeNumber: true } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            investigator: { select: { fullName: true, badgeNumber: true } },
            assigner: { select: { fullName: true } },
          },
        },
        evidence: { include: { evidenceType: true } },
        updates: { orderBy: { createdAt: 'desc' }, include: { author: { select: { fullName: true } } } },
      },
    });
    if (!c) throw NotFound();
    res.json(c);
  }),
);

// Head assigns / reassigns via the assign_case() stored function.
router.post(
  '/:id/assign',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const caseId = Number(req.params.id);
    const { investigatorId } = assignCaseSchema.parse(req.body);
    const [row] = await prisma.$queryRaw`SELECT assign_case(${caseId}::int, ${investigatorId}::int, ${req.auth.userId}::int) AS assignment_id`;
    res.status(201).json({ assignmentId: row.assignment_id });
  }),
);

// Head changes case status (trigger writes the audit row).
router.patch(
  '/:id/status',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const caseId = Number(req.params.id);
    const { status } = caseStatusSchema.parse(req.body);
    const data = { status };
    if (status === 'CLOSED') data.closedAt = new Date();
    if (status === 'REOPENED' || status === 'IN_PROGRESS' || status === 'OPEN') data.closedAt = null;
    const c = await prisma.case.update({ where: { caseId }, data });
    res.json(c);
  }),
);

// Investigation update (Head or the assigned Investigator).
router.post(
  '/:id/updates',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (req, res) => {
    const caseId = Number(req.params.id);
    await assertCaseVisible(req, caseId);
    const data = updateSchema.parse(req.body);
    const update = await prisma.investigationUpdate.create({
      data: { caseId, authorId: req.auth.userId, updateType: data.updateType, body: data.body },
      include: { author: { select: { fullName: true } } },
    });
    res.status(201).json(update);
  }),
);

export default router;
