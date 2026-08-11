import 'dotenv/config';
import { loadSettings } from '../src/config/settings.service.js';
import { sendMail } from '../src/lib/email/index.js';
import { logger } from '../src/config/logger.js';
import { disconnectDB } from '../src/config/db.js';

const to = process.argv[2] || 'codeshorts007@gmail.com';

async function main() {
  await loadSettings();

  const result = await sendMail({
    to,
    template: 'otp',
    subject: 'Humsafar Events — Test Email',
    data: { code: '123456', expiresInMinutes: 5 },
  });

  logger.info({ result }, `Test email sent to ${to}`);
}

main()
  .catch((err) => {
    console.error('Test email failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDB();
  });
