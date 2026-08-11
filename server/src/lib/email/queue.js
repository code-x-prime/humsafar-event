import { prisma } from '../../config/db.js';
import { logger } from '../../config/logger.js';

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000]; // 1m, 5m, 15m

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs `sender()` with up to 3 retries (1m/5m/15m backoff), logging every
// attempt to EmailLog. Callers await this — retries block the caller for the
// full backoff window, which is fine for the low-volume transactional sends
// this project has today (OTP only); a real background queue is a later concern.
export async function sendWithRetry({ to, template, provider, sender }) {
  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await sender();
      await prisma.emailLog.create({
        data: { to, template, status: 'SENT', provider, attempts: attempt + 1 },
      });
      return result;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, to, template }, 'Email send attempt failed');

      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  await prisma.emailLog.create({
    data: {
      to,
      template,
      status: 'DEAD_LETTER',
      provider,
      error: lastError?.message || 'Unknown error',
      attempts: RETRY_DELAYS_MS.length + 1,
    },
  });

  throw lastError;
}
