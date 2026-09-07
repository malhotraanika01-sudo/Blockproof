// Typed application errors. Thrown by services/controllers, translated to HTTP
// by the centralized error middleware.

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (msg, details) => new AppError(400, 'BAD_REQUEST', msg, details);
export const Unauthorized = (msg = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', msg);
export const Forbidden = (msg = 'You do not have access to this resource') => new AppError(403, 'FORBIDDEN', msg);
export const NotFound = (msg = 'Resource not found') => new AppError(404, 'NOT_FOUND', msg);
export const Conflict = (msg, details) => new AppError(409, 'CONFLICT', msg, details);
