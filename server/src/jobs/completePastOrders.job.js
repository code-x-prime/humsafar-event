import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { nowIST } from '../utils/datetime.js';

// Auto-completes any CONFIRMED (paid) order whose event date has fully
// passed — once the decoration date is over there's no further action
// needed on the order, so it moves from CONFIRMED straight to COMPLETED
// without staff having to close it out manually. Runs hourly.
export async function completePastOrders() {
  const endOfYesterday = nowIST().startOf('day').toDate();

  const result = await prisma.order.updateMany({
    where: { status: 'CONFIRMED', eventDate: { lt: endOfYesterday } },
    data: { status: 'COMPLETED' },
  });

  if (result.count > 0) {
    logger.info(`Auto-completed ${result.count} order(s) past their event date`);
  }
}
