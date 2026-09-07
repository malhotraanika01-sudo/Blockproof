import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { parseListQuery, paginated } from '../utils/query.js';
import { reportSchema } from '../validation/schemas.js';
import { ingestEvidence } from '../services/evidence.js';
import { NotFound, Forbidden } from '../utils/errors.js';
import { config } from '../config/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.evidence.maxUploadBytes, files: 8 },
});

const router = Router();
router.use(verifyJWT);

function trackingCode(seq) {
  return `BP-2026-${String(seq).padStart(4, '0')}`;
}

// Common User files a report (+ optional evidence files in the same request).
router.post(
  '/',
  requirePermission('report:create'),
  upload.array('files', 8),
  asyncHandler(async (req, res) => {
    const data = reportSchema.parse(req.body);
    const count = await prisma.crimeReport.count();
    const report = await prisma.crimeReport.create({
      data: {
        trackingCode: trackingCode(count + 1),
        reporterId: req.auth.userId,
        crimeType: data.crimeType,
        title: data.title,
        description: data.description,
        incidentAt: data.incidentAt,
        incidentLocation: data.incidentLocation,
      },
    });

    const evidence = [];
    for (const file of req.files ?? []) {
      evidence.push(await ingestEvidence({ file, reportId: report.reportId, submittedById: req.auth.userId }));
    }

    res.status(201).json({
      report,
      trackingCode: report.trackingCode,
      evidence: evidence.map((e) => ({ evidenceCode: e.evidenceCode, filename: e.originalFilename })),
      message: 'Report submitted. Your evidence is encrypted (AES-256-GCM) and fingerprinted (SHA-256) on a permissioned ledger.',
    });
  }),
);

// Common User: my reports. Head: all reports (queue).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { skip, take, q, orderBy, page, pageSize } = parseListQuery(req.query, {
      sortable: ['createdAt', 'status', 'crimeType'],
      defaultSort: 'createdAt',
    });

    const where = {};
    if (req.auth.role === 'COMMON_USER') where.reporterId = req.auth.userId;
    else if (req.auth.role === 'INVESTIGATOR') throw Forbidden('Investigators work from assigned cases');
    if (req.query.status) where.status = req.query.status;
    if (req.query.crimeType) where.crimeType = req.query.crimeType;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { trackingCode: { contains: q, mode: 'insensitive' } },
        { incidentLocation: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.crimeReport.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          reporter: { select: { fullName: true, email: true } },
          case: { select: { caseNumber: true, status: true } },
          _count: { select: { evidence: true } },
        },
      }),
      prisma.crimeReport.count({ where }),
    ]);
    res.json(paginated(items, total, { page, pageSize }));
  }),
);

// Public-ish tracking by code (still authenticated; a Common User can only see own).
router.get(
  '/track/:code',
  asyncHandler(async (req, res) => {
    const report = await prisma.crimeReport.findUnique({
      where: { trackingCode: req.params.code },
      include: {
        case: { select: { caseNumber: true, status: true, priority: true } },
        evidence: { select: { evidenceCode: true, integrityStatus: true, originalFilename: true } },
      },
    });
    if (!report) throw NotFound('No report with that tracking code');
    if (req.auth.role === 'COMMON_USER' && report.reporterId !== req.auth.userId) {
      throw Forbidden('That report belongs to another account');
    }
    res.json({
      trackingCode: report.trackingCode,
      status: report.status,
      crimeType: report.crimeType,
      title: report.title,
      submittedAt: report.createdAt,
      case: report.case,
      evidence: report.evidence,
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const report = await prisma.crimeReport.findUnique({
      where: { reportId: Number(req.params.id) },
      include: {
        reporter: { select: { fullName: true, email: true, phone: true } },
        case: true,
        evidence: { include: { evidenceType: true } },
      },
    });
    if (!report) throw NotFound();
    if (req.auth.role === 'COMMON_USER' && report.reporterId !== req.auth.userId) throw Forbidden();
    res.json(report);
  }),
);

// Head marks a report under review / rejected.
router.patch(
  '/:id/status',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const status = req.body.status;
    if (!['UNDER_REVIEW', 'REJECTED', 'SUBMITTED'].includes(status)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid status' } });
    }
    const report = await prisma.crimeReport.update({
      where: { reportId: Number(req.params.id) },
      data: { status },
    });
    res.json(report);
  }),
);

export default router;
