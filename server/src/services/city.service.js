import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { invalidateServiceabilityCache } from './location.service.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowUTC } from '../utils/datetime.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = {
    ...buildWhere(query, { searchFields: ['name', 'slug'], filterFields: ['region', 'isServiceable'] }),
    deletedAt: null,
  };
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.city.findMany({ where, orderBy, skip, take, include: { _count: { select: { pincodes: true } } } }),
    prisma.city.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function create(data) {
  const slug = data.slug || slugify(data.name);
  return prisma.city.create({ data: { ...data, slug } });
}

export async function getById(id) {
  const city = await prisma.city.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { pincodes: true, orders: true } } },
  });

  if (!city) throw apiError(404, ERROR_CODES.NOT_FOUND, 'City not found');
  return city;
}

export async function update(id, data) {
  await getById(id);
  const city = await prisma.city.update({ where: { id }, data });
  invalidateServiceabilityCache();
  return city;
}

export async function toggle(id, field, value) {
  await getById(id);
  const city = await prisma.city.update({ where: { id }, data: { [field]: value } });
  invalidateServiceabilityCache();
  return city;
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.city.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const city = await getById(id);
  const orderCount = await prisma.order.count({ where: { cityId: id } });

  if (orderCount > 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, `City has ${orderCount} order(s) and cannot be deleted`);
  }

  await prisma.city.update({ where: { id }, data: { deletedAt: nowUTC() } });
  invalidateServiceabilityCache();
  return city;
}

export async function stats(id) {
  await getById(id);

  const [orderCount, revenue] = await Promise.all([
    prisma.order.count({ where: { cityId: id } }),
    prisma.order.aggregate({ where: { cityId: id }, _sum: { total: true } }),
  ]);

  return { orderCount, revenue: Number(revenue._sum.total || 0) };
}

// GET /api/v1/cities — serviceable + coming-soon cities grouped by region.
export async function listGroupedByRegion() {
  const cities = await prisma.city.findMany({
    where: { deletedAt: null },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, slug: true, region: true, isServiceable: true, comingSoon: true },
  });

  const grouped = {};
  for (const city of cities) {
    const region = city.region || 'Other';
    grouped[region] = grouped[region] || [];
    grouped[region].push(city);
  }

  return grouped;
}

export async function getBySlug(slug) {
  const city = await prisma.city.findFirst({ where: { slug, deletedAt: null } });
  if (!city) throw apiError(404, ERROR_CODES.NOT_FOUND, 'City not found');
  return city;
}

// No geospatial index exists yet; does a simple in-memory nearest-by-Euclidean-distance
// scan over serviceable cities, which is fine at this data scale (single-digit city count).
export async function detectNearest(lat, lng) {
  const cities = await prisma.city.findMany({
    where: { isServiceable: true, deletedAt: null, lat: { not: null }, lng: { not: null } },
  });

  if (cities.length === 0) return null;

  let nearest = cities[0];
  let minDist = Infinity;
  for (const city of cities) {
    const d = (Number(city.lat) - lat) ** 2 + (Number(city.lng) - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = city;
    }
  }

  return nearest;
}
