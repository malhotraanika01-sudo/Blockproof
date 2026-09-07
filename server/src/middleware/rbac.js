import { Forbidden, Unauthorized } from '../utils/errors.js';

/**
 * requireRole('HEAD') / requireRole('HEAD','INVESTIGATOR')
 * Coarse gate by role name.
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth) return next(Unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(Forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

/**
 * requirePermission('blockchain:read')
 * Fine-grained gate against the role_permissions table (loaded in verifyJWT).
 * This is the server-side enforcement the PRD insists on: hiding a menu item is
 * never enough — Investigator + Common User get 403 on blockchain routes here.
 */
export function requirePermission(...codes) {
  return (req, _res, next) => {
    if (!req.auth) return next(Unauthorized());
    const missing = codes.filter((c) => !req.auth.permissions.has(c));
    if (missing.length) {
      return next(Forbidden(`Missing permission: ${missing.join(', ')}`));
    }
    next();
  };
}
