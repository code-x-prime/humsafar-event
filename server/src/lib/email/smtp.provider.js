import nodemailer from 'nodemailer';
import * as settings from '../../config/settings.service.js';

let cachedTransporter = null;
let cachedHost = null;

function getTransporter() {
  const cfg = settings.getGroup('EMAIL');
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword) return null;

  if (!cachedTransporter || cachedHost !== cfg.smtpHost) {
    cachedTransporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: Number(cfg.smtpPort) || 587,
      secure: Number(cfg.smtpPort) === 465,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPassword },
    });
    cachedHost = cfg.smtpHost;
  }

  return cachedTransporter;
}

export async function sendViaSmtp({ to, subject, html, text, cc, attachments }) {
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('SMTP is not configured');
    err.nonRetryable = true;
    throw err;
  }

  const cfg = settings.getGroup('EMAIL');
  const from = `${cfg.fromName || 'Humsafar Events'} <${cfg.fromEmail}>`;

  const info = await transporter.sendMail({ from, to, cc, subject, html, text, attachments });
  return { messageId: info.messageId };
}
