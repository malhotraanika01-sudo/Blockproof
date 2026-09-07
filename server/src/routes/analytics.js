// Head analytics — aggregate queries (COUNT/AVG/MIN/MAX/GROUP BY/HAVING),
// several served straight from the SQL views. Investigators get a limited subset.

import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
router.use(verifyJWT);

router.get(
  '/summary',
  requireRole('HEAD'),
  asyncHandler(async (_req, res) => {
    const [
      totalCases, activeCases, pendingReports, evidenceCount, verifiedCount, tamperAlerts,
    ] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'REOPENED'] } } }),
      prisma.crimeReport.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.evidence.count(),
      prisma.evidence.count({ where: { integrityStatus: 'VERIFIED' } }),
      prisma.evidence.count({ where: { integrityStatus: 'TAMPERED' } }),
    ]);
    res.json({ totalCases, activeCases, pendingReports, evidenceCount, verifiedCount, tamperAlerts });
  }),
);

router.get(
  '/charts',
  requireRole('HEAD'),
  asyncHandler(async (_req, res) => {
    const casesByStatus = await prisma.case.groupBy({ by: ['status'], _count: { _all: true } });
    const casesByPriority = await prisma.case.groupBy({ by: ['priority'], _count: { _all: true } });
    const reportsByType = await prisma.crimeReport.groupBy({ by: ['crimeType'], _count: { _all: true } });

    const evidenceByType = await prisma.$queryRaw`
      SELECT et.name AS type, COUNT(e.evidence_id)::int AS items,
             COALESCE(ROUND(AVG(e.size_bytes)),0)::bigint AS avg_bytes
      FROM evidence_types et
      LEFT JOIN evidence e ON e.evidence_type_id = et.evidence_type_id
      GROUP BY et.name ORDER BY items DESC`;

    const workload = await prisma.$queryRaw`
      SELECT investigator_name AS name, assigned_cases::int AS cases,
             in_progress_cases::int AS in_progress, evidence_in_scope::int AS evidence
      FROM investigator_case_summary ORDER BY assigned_cases DESC`;

    const verification = await prisma.blockchainTransaction.groupBy({
      by: ['eventType'],
      where: { eventType: { in: ['VERIFIED', 'TAMPER_DETECTED'] } },
      _count: { _all: true },
    });

    res.json({
      casesByStatus: casesByStatus.map((r) => ({ label: r.status, value: r._count._all })),
      casesByPriority: casesByPriority.map((r) => ({ label: r.priority, value: r._count._all })),
      reportsByType: reportsByType.map((r) => ({ label: r.crimeType, value: r._count._all })),
      evidenceByType,
      workload,
      verification: verification.map((r) => ({ label: r.eventType, value: r._count._all })),
    });
  }),
);

// Investigator-limited: just their own workload numbers.
router.get(
  '/my-workload',
  requireRole('INVESTIGATOR', 'HEAD'),
  asyncHandler(async (req, res) => {
    const rows = await prisma.$queryRaw`
      SELECT * FROM investigator_case_summary WHERE investigator_id = ${req.auth.userId}::int`;
    res.json(rows[0] ?? { assigned_cases: 0, in_progress_cases: 0, closed_cases: 0, evidence_in_scope: 0 });
  }),
);

export default router;
