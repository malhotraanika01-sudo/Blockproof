import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { Unauthorized } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Sign an access token carrying the user's id + role name. */
export function signToken(user) {
  return jwt.sign(
    { sub: user.userId, role: user.role?.name ?? user.roleName, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

/**
 * verifyJWT — validates the Bearer token, loads the user with role + permission
 * codes, and attaches req.auth = { userId, role, permissions:Set, user }.
 */
export const verifyJWT = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw Unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw Unauthorized('Session expired or invalid');
  }

  const user = await prisma.user.findUnique({
    where: { userId: payload.sub },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || !user.isActive) throw Unauthorized('Account is inactive');

  req.auth = {
    userId: user.userId,
    role: user.role.name,
    permissions: new Set(user.role.permissions.map((rp) => rp.permission.code)),
    user,
  };
  next();
});
