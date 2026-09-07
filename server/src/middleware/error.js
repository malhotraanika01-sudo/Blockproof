import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() },
    });
  }

  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'DUPLICATE', message: `A record with that ${err.meta?.target} already exists` },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: { code: 'FK_VIOLATION', message: 'Referenced record does not exist' } });
    }
  }

  // Postgres errors surfaced from raw functions/triggers (RAISE EXCEPTION)
  if (err?.meta?.code || err?.code?.startsWith?.('P')) {
    const dbMsg = err.meta?.message || err.message;
    if (dbMsg) {
      return res.status(400).json({ error: { code: 'DB_RULE', message: dbMsg } });
    }
  }

  // Multer
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds the size limit' } });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Something went wrong',
      ...(config.isProd() ? {} : { detail: String(err?.message || err) }),
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}
