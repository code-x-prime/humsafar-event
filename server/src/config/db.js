import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env.js';
import { logger } from './logger.js';

const adapter = new PrismaPg(env.DATABASE_URL);

export const prisma = new PrismaClient({ adapter });

export async function connectDB() {
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Database connected');
}

export async function disconnectDB() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
