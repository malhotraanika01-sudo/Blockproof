import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './db/prisma.js';
import { ledger } from './services/ledger/index.js';
import { ensureStorage } from './services/storage.js';

async function main() {
  await ensureStorage();
  await prisma.$connect();
  await ledger.init();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`BlockProof API on http://localhost:${config.port}  (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close();
    await ledger.shutdown();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
