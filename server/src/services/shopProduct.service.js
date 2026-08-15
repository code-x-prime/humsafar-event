import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base, excludeId) {
  let slug = base;
  let suffix = 2;
  while (await prisma.shopProduct.findFirst({ where: { slug, id: excludeId ? { not: excludeId } : undefined } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function dedupeIds(ids) {
  return ids ? [...new Set(ids)] : ids;
}

const INCLUDE = {
  categories: { include: { category: true } },
  media: { orderBy: { position: 'asc' } },
  _count: { select: { reviews: true, orderItems: true } },
};

async function syncMedia(productId, media) {
  if (!media) return;

  const existing = await prisma.shopProductMedia.findMany({ where: { productId } });
  const keptR2Keys = new Set(media.map((m) => m.r2Key));
  const removed = existing.filter((m) => !keptR2Keys.has(m.r2Key));

  await prisma.shopProductMedia.deleteMany({ where: { productId } });
  if (media.length) {
    await prisma.shopProductMedia.createMany({
      data: media.slice(0, 8).map((m, position) => ({
        productId,
        type: m.type || 'IMAGE',
        r2Key: m.r2Key,
        url: m.url,
        alt: m.alt || null,
        position,
        isPrimary: position === 0,
      })),
    });
  }

  await Promise.all(
    removed.map((m) =>
      deleteObject(m.r2Key).catch((err) => logger.error({ err, r2Key: m.r2Key }, 'Failed to delete R2 object during shop product media sync'))
    )
  );
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['title', 'slug', 'sku'], filterFields: ['isActive', 'isFeatured'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.shopProduct.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.shopProduct.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const product = await prisma.shopProduct.findUnique({ where: { id }, include: INCLUDE });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shop product not found');
  return product;
}

export async function create(data) {
  const { categoryIds: rawCategoryIds, media, ...rest } = data;
  const categoryIds = dedupeIds(rawCategoryIds);
  const slug = await uniqueSlug(rest.slug || slugify(rest.title));
  const metaTitle = rest.metaTitle || rest.title;
  const metaDescription = rest.metaDescription || rest.shortDescription || undefined;

  const product = await prisma.shopProduct.create({
    data: {
      ...rest,
      slug,
      metaTitle,
      metaDescription,
      categories: categoryIds?.length
        ? { create: categoryIds.map((categoryId, position) => ({ categoryId, position })) }
        : undefined,
    },
  });

  await syncMedia(product.id, media);

  return getById(product.id);
}

export async function update(id, data) {
  await getById(id);
  const { categoryIds: rawCategoryIds, media, ...rest } = data;
  const categoryIds = dedupeIds(rawCategoryIds);

  if (rest.slug) {
    rest.slug = await uniqueSlug(rest.slug, id);
  }

  if (categoryIds) {
    await prisma.shopProductCategory.deleteMany({ where: { productId: id } });
    await prisma.shopProductCategory.createMany({
      data: categoryIds.map((categoryId, position) => ({ productId: id, categoryId, position })),
    });
  }

  await syncMedia(id, media);

  await prisma.shopProduct.update({ where: { id }, data: rest });
  return getById(id);
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.shopProduct.update({ where: { id }, data: { [field]: value }, include: INCLUDE });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.shopProduct.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const product = await getById(id);
  const orderItemCount = await prisma.orderItem.count({ where: { shopProductId: id } });

  if (orderItemCount > 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, `Product has ${orderItemCount} order item(s) and cannot be deleted`);
  }

  await Promise.all(
    product.media.map((m) =>
      deleteObject(m.r2Key).catch((err) => logger.error({ err, r2Key: m.r2Key }, 'Failed to delete R2 object during shop product removal'))
    )
  );

  await prisma.shopProduct.delete({ where: { id } });
  return product;
}

// ── PUBLIC ──────────────────────────────────────────────────────────────

const PUBLIC_SELECT = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  description: true,
  highlights: true,
  price: true,
  mrp: true,
  stock: true,
  shippingInfo: true,
  avgRating: true,
  reviewCount: true,
  metaTitle: true,
  metaDescription: true,
  media: { orderBy: { position: 'asc' }, select: { id: true, url: true, alt: true, type: true, isPrimary: true } },
  categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
};

export async function listPublic(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = { isActive: true, ...buildWhere(query, { searchFields: ['title'], filterFields: [] }) };

  if (query.categorySlug) {
    where.categories = { some: { category: { slug: query.categorySlug } } };
  }

  if (query.featured) {
    where.isFeatured = true;
  }

  const orderByMap = {
    latest: { createdAt: 'desc' },
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
    rating: { avgRating: 'desc' },
  };
  const orderBy = orderByMap[query.sort] || { position: 'asc' };

  const [items, total] = await Promise.all([
    prisma.shopProduct.findMany({ where, orderBy, skip, take, select: PUBLIC_SELECT }),
    prisma.shopProduct.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getPublicBySlug(slug) {
  const product = await prisma.shopProduct.findFirst({
    where: { slug, isActive: true },
    select: {
      ...PUBLIC_SELECT,
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
          adminReply: true,
          user: { select: { name: true } },
          media: { select: { url: true, type: true } },
        },
      },
    },
  });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  prisma.shopProduct.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return product;
}

const RELATED_SELECT = {
  id: true,
  title: true,
  slug: true,
  price: true,
  mrp: true,
  avgRating: true,
  reviewCount: true,
  media: { where: { isPrimary: true }, take: 1, select: { url: true } },
};

const RELATED_LIMIT = 10;

// Same pattern as the decoration catalog's getRelated: "Similar Products" =
// other active products sharing a category, "You May Also Like" = featured
// active products outside that category, so the two rows don't overlap.
export async function getRelated(slug) {
  const product = await prisma.shopProduct.findFirst({
    where: { slug, isActive: true },
    select: { id: true, categories: { select: { categoryId: true } } },
  });

  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Shop product not found');

  const categoryIds = product.categories.map((c) => c.categoryId);

  const [similar, youMayLike] = await Promise.all([
    categoryIds.length > 0
      ? prisma.shopProduct.findMany({
          where: {
            isActive: true,
            id: { not: product.id },
            categories: { some: { categoryId: { in: categoryIds } } },
          },
          orderBy: { position: 'asc' },
          take: RELATED_LIMIT,
          select: RELATED_SELECT,
        })
      : [],
    prisma.shopProduct.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        id: { not: product.id },
        categories: categoryIds.length > 0 ? { none: { categoryId: { in: categoryIds } } } : undefined,
      },
      orderBy: { position: 'asc' },
      take: RELATED_LIMIT,
      select: RELATED_SELECT,
    }),
  ]);

  return { similar, youMayLike };
}
