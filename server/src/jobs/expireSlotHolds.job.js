import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { nowUTC } from '../utils/datetime.js';

// Releases any SlotHold whose expiresAt has passed so the slot's capacity is
// freed up for other customers. Runs every minute per the master spec §6.2.
export async function expireSlotHolds() {
  const result = await prisma.slotHold.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: nowUTC() } },
    data: { status: 'EXPIRED' },
  });

  if (result.count > 0) {
    logger.info(`Expired ${result.count} slot hold(s)`);
  }
}
