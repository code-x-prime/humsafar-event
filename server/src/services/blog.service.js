import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
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
  const where = buildWhere(query, { searchFields: ['title', 'slug'], filterFields: ['isPublished'] });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy, skip, take }),
    prisma.blogPost.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Blog post not found');
  return post;
}

export async function create(data) {
  const slug = data.slug || slugify(data.title);
  const publishedAt = data.isPublished ? nowUTC() : undefined;
  return prisma.blogPost.create({ data: { ...data, slug, publishedAt } });
}

export async function update(id, data) {
  const existing = await getById(id);
  const publishedAt = data.isPublished && !existing.publishedAt ? nowUTC() : undefined;
  return prisma.blogPost.update({ where: { id }, data: { ...data, publishedAt } });
}

export async function toggle(id, field, value) {
  const existing = await getById(id);
  const publishedAt = field === 'isPublished' && value && !existing.publishedAt ? nowUTC() : undefined;
  return prisma.blogPost.update({ where: { id }, data: { [field]: value, publishedAt } });
}

export async function remove(id) {
  const post = await getById(id);
  await prisma.blogPost.delete({ where: { id } });
  return post;
}
