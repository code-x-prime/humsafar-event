import { prisma } from './db.js';
import { logger } from './logger.js';
import { encrypt, decrypt } from '../utils/crypto.js';

let cache = new Map();

function decodeValue(row) {
  if (!row.isSecret) return row.value;
  // Secret values are stored as an encrypted JSON string; decrypt then parse.
  try {
    return JSON.parse(decrypt(row.value));
  } catch (err) {
    logger.error({ err, key: row.key }, 'Failed to decrypt setting');
    return null;
  }
}

export async function loadSettings() {
  const rows = await prisma.setting.findMany();
  const next = new Map();

  for (const row of rows) {
    next.set(row.key, { value: decodeValue(row), group: row.group, isSecret: row.isSecret });
  }

  cache = next;
  logger.info(`Settings cache loaded (${cache.size} keys)`);
}

export function get(key, fallback = undefined) {
  return cache.has(key) ? cache.get(key).value : fallback;
}

export function getGroup(group) {
  const out = {};
  for (const [key, entry] of cache.entries()) {
    if (entry.group === group) out[key] = entry.value;
  }
  return out;
}

export async function set(key, value, { group, isSecret = false } = {}) {
  const storedValue = isSecret ? encrypt(JSON.stringify(value)) : value;

  await prisma.setting.upsert({
    where: { key },
    update: { value: storedValue, group, isSecret },
    create: { key, value: storedValue, group, isSecret },
  });

  cache.set(key, { value, group, isSecret });
}

export async function invalidate() {
  await loadSettings();
}
