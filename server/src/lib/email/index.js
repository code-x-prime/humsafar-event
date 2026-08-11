import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import * as settings from '../../config/settings.service.js';
import { logger } from '../../config/logger.js';
import { sendViaSmtp } from './smtp.provider.js';
import { sendViaBrevo } from './brevo.provider.js';
import { sendWithRetry } from './queue.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const templateCache = new Map();

function renderTemplate(template, data) {
  if (!templateCache.has(template)) {
    const filePath = path.join(dirname, 'templates', `${template}.hbs`);
    const source = fs.readFileSync(filePath, 'utf8');
    templateCache.set(template, Handlebars.compile(source));
  }
  return templateCache.get(template)(data);
}

// The single entry point every part of the app should call to send an email.
// Tries the configured primary provider, falls back to SMTP on failure, and
// logs every attempt to EmailLog via the retry queue.
export async function sendMail({ to, template, data, subject }) {
  const cfg = settings.getGroup('EMAIL');
  const primaryProvider = cfg.provider === 'BREVO' ? 'BREVO' : 'SMTP';

  const html = renderTemplate(template, data);

  const attemptProvider = async (providerName) => {
    if (providerName === 'BREVO') {
      return sendViaBrevo({ to, subject, html });
    }
    return sendViaSmtp({ to, subject, html });
  };

  try {
    return await sendWithRetry({
      to,
      template,
      provider: primaryProvider,
      sender: () => attemptProvider(primaryProvider),
    });
  } catch (primaryErr) {
    const fallbackProvider = primaryProvider === 'BREVO' ? 'SMTP' : 'BREVO';
    logger.warn({ err: primaryErr, primaryProvider }, 'Primary email provider failed, trying fallback');

    return sendWithRetry({
      to,
      template,
      provider: fallbackProvider,
      sender: () => attemptProvider(fallbackProvider),
    });
  }
}
