import * as settings from '../../config/settings.service.js';

// Brevo's transactional HTTP API (not the SMTP relay — that path is
// smtp.provider.js). Only wired up if a brevoApiKey is present in Settings;
// the user has so far only supplied SMTP relay credentials, so this stays
// dormant until a real Brevo API key is added via the admin Settings page.
export async function sendViaBrevo({ to, subject, html, text }) {
  const cfg = settings.getGroup('EMAIL');
  if (!cfg.brevoApiKey) {
    const err = new Error('Brevo API key is not configured');
    err.nonRetryable = true;
    throw err;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': cfg.brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: cfg.fromEmail, name: cfg.fromName || 'Humsafar Events' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return { messageId: data.messageId };
}
