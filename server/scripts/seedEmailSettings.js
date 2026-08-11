import 'dotenv/config';
import { loadSettings, set } from '../src/config/settings.service.js';
import { logger } from '../src/config/logger.js';
import { disconnectDB } from '../src/config/db.js';

// One-off script to seed the Brevo SMTP relay credentials into the encrypted
// Setting table — never into .env or hardcoded here. Pass credentials via
// env vars: SMTP_USER, SMTP_PASSWORD (and optionally SMTP_HOST, SMTP_PORT,
// FROM_EMAIL, FROM_NAME).
async function main() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    throw new Error('Set SMTP_USER and SMTP_PASSWORD env vars before running this script.');
  }

  await loadSettings();

  await set('provider', 'SMTP', { group: 'EMAIL', isSecret: false });
  await set('fromEmail', process.env.FROM_EMAIL || 'codeshorts007@gmail.com', { group: 'EMAIL', isSecret: false });
  await set('fromName', process.env.FROM_NAME || 'Humsafar Events', { group: 'EMAIL', isSecret: false });
  await set('smtpHost', process.env.SMTP_HOST || 'smtp-relay.brevo.com', { group: 'EMAIL', isSecret: false });
  await set('smtpPort', Number(process.env.SMTP_PORT) || 587, { group: 'EMAIL', isSecret: false });
  await set('smtpUser', smtpUser, { group: 'EMAIL', isSecret: false });
  await set('smtpPassword', smtpPassword, { group: 'EMAIL', isSecret: true });

  logger.info('Email settings seeded into Setting table.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDB();
  });
