import 'dotenv/config';
import { app } from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { loadSettings } from './src/config/settings.service.js';
import { startJobs, stopJobs } from './src/jobs/index.js';
import { logger } from './src/config/logger.js';

const start = async () => {
  await connectDB();
  await loadSettings();
  startJobs();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Humsafar API on :${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal) => {
    logger.warn(`${signal} received, closing...`);
    stopJobs();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
  process.on('unhandledRejection', (err) => {
    logger.error(err);
    shutdown('unhandledRejection');
  });
};

start();
