import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { expireSlotHolds } from './expireSlotHolds.job.js';
import { completePastOrders } from './completePastOrders.job.js';
import { sendReviewReminders } from './sendReviewReminders.job.js';

// releaseAbandonedOrders, eventReminder, and balanceReminder jobs are still
// deferred — no data/UI exists yet for those flows.

const tasks = [];

export function startJobs() {
  tasks.push(
    cron.schedule('* * * * *', () => {
      expireSlotHolds().catch((err) => logger.error({ err }, 'expireSlotHolds job failed'));
    })
  );

  tasks.push(
    cron.schedule('0 * * * *', () => {
      completePastOrders().catch((err) => logger.error({ err }, 'completePastOrders job failed'));
    })
  );

  tasks.push(
    cron.schedule('*/15 * * * *', () => {
      sendReviewReminders().catch((err) => logger.error({ err }, 'sendReviewReminders job failed'));
    })
  );

  logger.info(`Started ${tasks.length} cron job(s)`);
}

export function stopJobs() {
  for (const task of tasks) task.stop();
  tasks.length = 0;
}
