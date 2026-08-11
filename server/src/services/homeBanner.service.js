import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function safeDeleteR2Object(r2Key) {
  if (!r2Key) return;
  try {
    await deleteObject(r2Key);
  } catch (err) {
    logger.error({ err, r2Key }, 'Failed to delete R2 object during home banner cleanup');
  }
}

export async function list() {
  return prisma.homeBanner.findMany({ orderBy: { position: 'asc' } });
}

export async function getById(id) {
  const banner = await prisma.homeBanner.findUnique({ where: { id } });
  if (!banner) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Banner not found');
  return banner;
}

export async function create(data) {
  return prisma.homeBanner.create({ data });
}

// If the update replaces desktopImageR2Key/mobileImageR2Key with a different
// value (or clears it), the previous R2 object is deleted so it doesn't sit
// orphaned in the bucket.
export async function update(id, data) {
  const existing = await getById(id);

  if ('desktopImageR2Key' in data && data.desktopImageR2Key !== existing.desktopImageR2Key) {
    await safeDeleteR2Object(existing.desktopImageR2Key);
  }
  if ('mobileImageR2Key' in data && data.mobileImageR2Key !== existing.mobileImageR2Key) {
    await safeDeleteR2Object(existing.mobileImageR2Key);
  }

  return prisma.homeBanner.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.homeBanner.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.homeBanner.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const banner = await getById(id);
  await Promise.all([safeDeleteR2Object(banner.desktopImageR2Key), safeDeleteR2Object(banner.mobileImageR2Key)]);
  await prisma.homeBanner.delete({ where: { id } });
  return banner;
}
