import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const reportSchema = z.object({
  crimeType: z.string().trim().min(2).max(60),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10),
  incidentAt: z.coerce.date(),
  incidentLocation: z.string().trim().min(2).max(255),
});

export const createCaseSchema = z.object({
  reportId: z.coerce.number().int().positive(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  title: z.string().trim().min(4).max(160).optional(),
});

export const assignCaseSchema = z.object({
  investigatorId: z.coerce.number().int().positive(),
});

export const caseStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'REOPENED']),
});

export const updateSchema = z.object({
  updateType: z.enum(['NOTE', 'FINDING', 'REQUEST', 'STATUS_CHANGE']),
  body: z.string().trim().min(2),
});

export const transferInitiateSchema = z.object({
  evidenceId: z.coerce.number().int().positive(),
  fromLocationId: z.coerce.number().int().positive(),
  toLocationId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(255),
});

export const transferCompleteSchema = z.object({
  status: z.enum(['COMPLETED', 'REJECTED']),
});
