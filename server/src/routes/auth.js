import { Router } from 'express';
import argon2 from 'argon2';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken, verifyJWT } from '../middleware/auth.js';
import { BadRequest, Unauthorized } from '../utils/errors.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';
import { audit } from '../services/audit.js';

const router = Router();

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
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
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
    res.json({ token: signToken(user), user: publicUser(user) });
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
