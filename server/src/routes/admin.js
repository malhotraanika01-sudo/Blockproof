// Head-only: audit logs, user & role management, lookup data for forms.

import { Router } from 'express';
import argon2 from 'argon2';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { parseListQuery, paginated } from '../utils/query.js';
import { registerSchema } from '../validation/schemas.js';
import { BadRequest } from '../utils/errors.js';
import { audit } from '../services/audit.js';

const router = Router();
router.use(verifyJWT);

// ── Lookups (any authenticated user) ─────────────────────────
router.get(
  '/lookups/evidence-types',
  asyncHandler(async (_req, res) => res.json(await prisma.evidenceType.findMany({ orderBy: { name: 'asc' } }))),
);

router.get(
  '/lookups/locations',
  requireRole('HEAD', 'INVESTIGATOR'),
  asyncHandler(async (_req, res) =>
    res.json(await prisma.evidenceLocation.findMany({ orderBy: { name: 'asc' } }))),
);

router.get(
  '/lookups/investigators',
  requireRole('HEAD'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.user.findMany({
      where: { role: { name: 'INVESTIGATOR' }, isActive: true },
      select: { userId: true, fullName: true, badgeNumber: true, email: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(rows);
  }),
);

// ── Audit logs (Head only) ───────────────────────────────────
router.get(
  '/audit',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const { skip, take, q, orderBy, page, pageSize } = parseListQuery(req.query, {
      sortable: ['createdAt', 'action'],
      defaultSort: 'createdAt',
    });
    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (q) where.OR = [{ action: { contains: q, mode: 'insensitive' } }, { detail: { contains: q, mode: 'insensitive' } }];

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take, orderBy,
        include: { actor: { select: { fullName: true, role: { select: { name: true } } } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json(paginated(items, total, { page, pageSize }));
  }),
);

// ── User management (Head only) ──────────────────────────────
router.get(
  '/users',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const { skip, take, q, orderBy, page, pageSize } = parseListQuery(req.query, {
      sortable: ['createdAt', 'fullName', 'email'],
      defaultSort: 'createdAt',
    });
    const where = {};
    if (req.query.role) where.role = { name: req.query.role };
    if (q) where.OR = [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take, orderBy,
        select: {
          userId: true, email: true, fullName: true, phone: true, badgeNumber: true,
          isActive: true, createdAt: true, role: { select: { name: true } },
          _count: { select: { assignmentsAsInvestig: true, crimeReports: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json(paginated(items, total, { page, pageSize }));
  }),
);

// Head creates a staff account (INVESTIGATOR or HEAD).
router.post(
  '/users',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const base = registerSchema.parse(req.body);
    const roleName = req.body.role;
    if (!['INVESTIGATOR', 'HEAD'].includes(roleName)) throw BadRequest('role must be INVESTIGATOR or HEAD');
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (await prisma.user.findUnique({ where: { email: base.email } })) throw BadRequest('Email already in use');

    const user = await prisma.user.create({
      data: {
        roleId: role.roleId,
        email: base.email,
        fullName: base.fullName,
        phone: base.phone,
        badgeNumber: req.body.badgeNumber || null,
        passwordHash: await argon2.hash(base.password, { type: argon2.argon2id }),
      },
      select: { userId: true, email: true, fullName: true, badgeNumber: true, role: { select: { name: true } } },
    });
    await audit({ actorId: req.auth.userId, action: 'USER_CREATED', entityType: 'User', entityId: user.userId, detail: roleName, ip: req.ip });
    res.status(201).json(user);
  }),
);

router.patch(
  '/users/:id',
  requireRole('HEAD'),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const data = {};
    if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
    if (req.body.fullName) data.fullName = req.body.fullName;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    const user = await prisma.user.update({
      where: { userId }, data,
      select: { userId: true, email: true, fullName: true, isActive: true, role: { select: { name: true } } },
    });
    await audit({ actorId: req.auth.userId, action: 'USER_UPDATED', entityType: 'User', entityId: userId, ip: req.ip });
    res.json(user);
  }),
);

export default router;
