import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { testConnection as testR2 } from '../lib/r2.js';
import { testConnection as testRazorpay } from '../lib/razorpay.js';

async function checkDb() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch (err) {
    logger.error({ err }, 'Health check: database unreachable');
    return 'unreachable';
  }
}

async function checkR2() {
  try {
    await testR2();
    return 'ok';
  } catch {
    return 'not_configured';
  }
}

async function checkRazorpay() {
  try {
    await testRazorpay();
    return 'ok';
  } catch {
    return 'not_configured';
  }
}

export async function getHealth() {
  const [db, r2, razorpay] = await Promise.all([checkDb(), checkR2(), checkRazorpay()]);
  return { db, r2, razorpay };
}
