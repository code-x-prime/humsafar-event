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
    logger.error({ err, r2Key }, 'Failed to delete R2 object during gallery cleanup');
  }
}

export async function list() {
  return prisma.galleryImage.findMany({ orderBy: { position: 'asc' } });
}

export async function getById(id) {
  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Gallery image not found');
  return image;
}

// New photos are appended after the current highest position so the admin
// doesn't have to manually reorder every upload — they can drag it into
// place afterwards if needed.
export async function create(data) {
  const maxPosition = await prisma.galleryImage.aggregate({ _max: { position: true } });
  return prisma.galleryImage.create({
    data: { ...data, position: data.position ?? (maxPosition._max.position ?? -1) + 1 },
  });
}

// If the update replaces imageR2Key with a different value (or clears it),
// the previous R2 object is deleted so it doesn't sit orphaned in the bucket.
export async function update(id, data) {
  const existing = await getById(id);

  if ('imageR2Key' in data && data.imageR2Key !== existing.imageR2Key) {
    await safeDeleteR2Object(existing.imageR2Key);
  }

  return prisma.galleryImage.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.galleryImage.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.galleryImage.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const image = await getById(id);
  await safeDeleteR2Object(image.imageR2Key);
  await prisma.galleryImage.delete({ where: { id } });
  return image;
}

export async function listPublic({ homeOnly = false } = {}) {
  return prisma.galleryImage.findMany({
    where: { isActive: true, ...(homeOnly ? { showOnHome: true } : {}) },
    orderBy: { position: 'asc' },
    select: { id: true, image: true, title: true },
  });
}
