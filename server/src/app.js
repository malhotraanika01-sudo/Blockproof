import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { ledger } from './services/ledger/index.js';

import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import caseRoutes from './routes/cases.js';
import evidenceRoutes from './routes/evidence.js';
import transferRoutes from './routes/transfers.js';
import blockchainRoutes from './routes/blockchain.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!config.isProd()) app.use(morgan('dev'));

  app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, max: 50 }), authRoutes);

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', ledger: ledger.driver, ready: ledger.ready }));

  app.use('/api/reports', reportRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/evidence', evidenceRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/blockchain', blockchainRoutes); // Head-only, enforced in the router
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
