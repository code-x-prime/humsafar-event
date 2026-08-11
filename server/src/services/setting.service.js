import * as settingsCache from '../config/settings.service.js';
import { maskSecret } from '../utils/crypto.js';
import { ERROR_CODES } from '../config/constants.js';

const GROUPS = ['GENERAL', 'CONTACT', 'SOCIAL', 'SEO', 'PAYMENT', 'STORAGE', 'EMAIL', 'BUSINESS_RULES'];

// Fields considered secret within each group — encrypted at rest, masked on read,
// write-only from the admin UI (an empty/unset field on save means "keep existing value").
const SECRET_FIELDS_BY_GROUP = {
  STORAGE: ['accessKeyId', 'secretAccessKey'],
  PAYMENT: ['keySecret', 'webhookSecret'],
  EMAIL: ['smtpPassword', 'brevoApiKey'],
};

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function assertValidGroup(group) {
  if (!GROUPS.includes(group)) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `Unknown settings group: ${group}`);
  }
}

// Returns every key in the group with secret fields masked (never the real value).
export function getGroupMasked(group) {
  assertValidGroup(group);
  const raw = settingsCache.getGroup(group);
  const secretFields = SECRET_FIELDS_BY_GROUP[group] || [];

  const masked = {};
  for (const [key, value] of Object.entries(raw)) {
    masked[key] = secretFields.includes(key) && value ? maskSecret(String(value)) : value;
  }
  return masked;
}

// Saves a group's settings. Secret fields whose incoming value is empty/undefined
// are left untouched (so re-saving the form without retyping a password doesn't wipe it).
export async function saveGroup(group, data) {
  assertValidGroup(group);
  const secretFields = SECRET_FIELDS_BY_GROUP[group] || [];

  for (const [key, value] of Object.entries(data)) {
    const isSecret = secretFields.includes(key);

    if (isSecret && (value === '' || value === undefined || value === null)) {
      continue; // keep existing value
    }

    await settingsCache.set(key, value, { group, isSecret });
  }

  return getGroupMasked(group);
}
