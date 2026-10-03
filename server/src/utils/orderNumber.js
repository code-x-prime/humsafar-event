import { prisma } from '../config/db.js';
import { nowUTC } from './datetime.js';

// Order numbers are PREFIX-YYYYMM-5 random digits, so two orders in the same
// month can collide — at a few hundred orders a month that is a real
// possibility, and a collision used to surface as a failed checkout. This
// picks a candidate, checks it is free, and tries again if not.
export async function generateUniqueOrderNumber(prefix) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const now = nowUTC();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(10000 + Math.random() * 90000);
    const candidate = `${prefix}-${yyyymm}-${rand}`;

    const taken = await prisma.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  throw new Error('Could not generate a unique order number');
}
