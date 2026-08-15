import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';

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
  const where = buildWhere(query, { searchFields: ['name', 'slug'], filterFields: ['isActive'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.shopCategory.findMany({ where, orderBy, skip, take, include: { _count: { select: { products: true } } } }),
    prisma.shopCategory.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const category = await prisma.shopCategory.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shop category not found');
  return category;
}

export async function create(data) {
  const slug = data.slug || slugify(data.name);
  return prisma.shopCategory.create({ data: { ...data, slug } });
}

export async function update(id, data) {
  await getById(id);
  return prisma.shopCategory.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.shopCategory.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.shopCategory.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const category = await getById(id);
  if (category._count.products > 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, `Category has ${category._count.products} product(s) and cannot be deleted`);
  }
  await prisma.shopCategory.delete({ where: { id } });
  return category;
}

export async function listPublic() {
  return prisma.shopCategory.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, slug: true, image: true, _count: { select: { products: true } } },
  });
}
