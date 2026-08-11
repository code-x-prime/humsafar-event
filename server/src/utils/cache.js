// Simple in-memory cache (single-process only — no Redis provisioned).
// get/set with TTL, plus invalidate-by-prefix for bulk cache-busting
// (e.g. invalidate all "pincode:" entries when a City is toggled).

const store = new Map();

export function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function set(key, value, ttlMs = 10 * 60 * 1000) {
  store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
}

export function invalidate(key) {
  store.delete(key);
}

export function invalidateByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
