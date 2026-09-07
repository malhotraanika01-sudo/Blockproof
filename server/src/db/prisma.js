import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

export const prisma = new PrismaClient({
  log: config.isProd() ? ['warn', 'error'] : ['warn', 'error'],
});

// Serialize BigInt (evidence.size_bytes) safely in JSON responses.
BigInt.prototype.toJSON = function toJSON() {
  return Number(this);
};
