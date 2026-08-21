import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowUTC } from '../utils/datetime.js';
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
    logger.error({ err, r2Key }, 'Failed to delete R2 object during banner cleanup');
  }
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['title', 'subtitle'], filterFields: ['placement', 'isActive'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.banner.findMany({ where, orderBy, skip, take }),
    prisma.banner.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Banner not found');
  return banner;
}

export async function create(data) {
  const maxPosition = await prisma.banner.aggregate({
    where: { placement: data.placement },
    _max: { position: true },
  });
  const position = (maxPosition._max.position ?? -1) + 1;

  return prisma.banner.create({ data: { ...data, position } });
}

// If the update replaces desktopImageR2Key/mobileImageR2Key with a different
// value (or clears it), the previous R2 object is deleted so it doesn't sit
// orphaned in the bucket forever.
export async function update(id, data) {
  const existing = await getById(id);

  if (data.desktopImageR2Key && data.desktopImageR2Key !== existing.desktopImageR2Key) {
    await safeDeleteR2Object(existing.desktopImageR2Key);
  }
  if (data.mobileImageR2Key && data.mobileImageR2Key !== existing.mobileImageR2Key) {
    await safeDeleteR2Object(existing.mobileImageR2Key);
  }

  return prisma.banner.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.banner.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.banner.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const banner = await getById(id);

  await Promise.all([
    safeDeleteR2Object(banner.desktopImageR2Key),
    safeDeleteR2Object(banner.mobileImageR2Key),
  ]);

  await prisma.banner.delete({ where: { id } });
  return banner;
}

// GET /api/v1/banners?placement=HOME_HERO — active, in-schedule banners for public display.
export async function listActiveByPlacement(placement) {
  const now = nowUTC();

  return prisma.banner.findMany({
    where: {
      placement,
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { position: 'asc' },
  });
}
