import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ERROR_CODES } from '../config/constants.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../config/logger.js';
import { syncProductSections } from './section.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Appends -2, -3, ... until the slug is free, so admins reusing a similar
// title (or resubmitting) get a working product instead of a 409.
async function uniqueSlug(base, excludeId) {
  let slug = base;
  let suffix = 2;

  while (await prisma.product.findFirst({ where: { slug, id: excludeId ? { not: excludeId } : undefined } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

const INCLUDE = {
  categories: { include: { category: true } },
  cities: { include: { city: true } },
  media: { orderBy: { position: 'asc' } },
  variants: { orderBy: { position: 'asc' } },
  faqItems: { orderBy: { position: 'asc' } },
  addOns: { include: { addOn: true } },
  sections: { include: { section: true } },
  _count: { select: { reviews: true, orderItems: true } },
};

async function syncAddOns(productId, addOnIds) {
  if (!addOnIds) return;
  await prisma.productAddOn.deleteMany({ where: { productId } });
  if (addOnIds.length) {
    await prisma.productAddOn.createMany({ data: addOnIds.map((addOnId) => ({ productId, addOnId })) });
  }
}

// Replaces a product's ProductMedia rows to match the given ordered list
// (each item carries the r2Key/url from the admin's upload step). Any rows
// dropped from the new list have their underlying R2 object deleted too, so
// removing/replacing an image in the admin never orphans it in the bucket.
async function syncMedia(productId, media) {
  if (!media) return;

  const existing = await prisma.productMedia.findMany({ where: { productId } });
  const keptR2Keys = new Set(media.map((m) => m.r2Key));
  const removed = existing.filter((m) => !keptR2Keys.has(m.r2Key));

  await prisma.productMedia.deleteMany({ where: { productId } });
  if (media.length) {
    await prisma.productMedia.createMany({
      data: media.slice(0, 5).map((m, position) => ({
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
      deleteObject(m.r2Key).catch((err) => logger.error({ err, r2Key: m.r2Key }, 'Failed to delete R2 object during product media sync'))
    )
  );
}

async function syncVariants(productId, variants) {
  if (!variants) return;
  await prisma.productVariant.deleteMany({ where: { productId } });
  if (variants.length) {
    await prisma.productVariant.createMany({
      data: variants.map((v, position) => ({ productId, name: v.name, swatches: v.swatches || [], position })),
    });
  }
}

async function syncFaqItems(productId, faqItems) {
  if (!faqItems) return;
  await prisma.faqItem.deleteMany({ where: { scope: 'PRODUCT', refId: productId } });
  if (faqItems.length) {
    await prisma.faqItem.createMany({
      data: faqItems.map((f, position) => ({
        scope: 'PRODUCT',
        refId: productId,
        question: f.question,
        answer: f.answer,
        position,
      })),
    });
  }
}

async function syncCities(productId, cityIds) {
  if (!cityIds) return;
  await prisma.productCity.deleteMany({ where: { productId } });
  if (cityIds.length) {
    await prisma.productCity.createMany({
      data: cityIds.map((cityId) => ({ productId, cityId })),
    });
  }
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['title', 'slug'], filterFields: ['isActive', 'isFeatured'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip, take, include: INCLUDE }),
    prisma.product.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const product = await prisma.product.findUnique({ where: { id }, include: INCLUDE });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');
  return product;
}

export async function create(data) {
  const { categoryIds, cityIds, media, variants, faqItems, addOnIds, sectionIds, ...rest } = data;
  const slug = await uniqueSlug(rest.slug || slugify(rest.title));
  const metaTitle = rest.metaTitle || rest.title;
  const metaDescription = rest.metaDescription || rest.shortDescription || undefined;

  const product = await prisma.product.create({
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

  await Promise.all([
    syncMedia(product.id, media),
    syncVariants(product.id, variants),
    syncFaqItems(product.id, faqItems),
    syncCities(product.id, cityIds),
    syncAddOns(product.id, addOnIds),
    syncProductSections(product.id, sectionIds),
  ]);

  return getById(product.id);
}

export async function update(id, data) {
  await getById(id);
  const { categoryIds, cityIds, media, variants, faqItems, addOnIds, sectionIds, ...rest } = data;

  if (rest.slug) {
    rest.slug = await uniqueSlug(rest.slug, id);
  }

  if (categoryIds) {
    await prisma.productCategory.deleteMany({ where: { productId: id } });
    await prisma.productCategory.createMany({
      data: categoryIds.map((categoryId, position) => ({ productId: id, categoryId, position })),
    });
  }

  await Promise.all([
    syncMedia(id, media),
    syncVariants(id, variants),
    syncFaqItems(id, faqItems),
    syncCities(id, cityIds),
    syncAddOns(id, addOnIds),
    syncProductSections(id, sectionIds),
  ]);

  await prisma.product.update({ where: { id }, data: rest });
  return getById(id);
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.product.update({ where: { id }, data: { [field]: value }, include: INCLUDE });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.product.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const product = await getById(id);
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

  if (orderItemCount > 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, `Product has ${orderItemCount} order item(s) and cannot be deleted`);
  }

  await Promise.all(
    product.media.map((m) =>
      deleteObject(m.r2Key).catch((err) => logger.error({ err, r2Key: m.r2Key }, 'Failed to delete R2 object during product removal'))
    )
  );

  await prisma.product.delete({ where: { id } });
  return product;
}

// GET /api/v1/products/:slug — a product's full public detail page.
export async function getPublicBySlug(slug) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      inclusions: true,
      exclusions: true,
      careInfo: true,
      deliveryInfo: true,
      price: true,
      mrp: true,
      setupTimeMinutes: true,
      avgRating: true,
      reviewCount: true,
      categories: {
        select: { category: { select: { name: true, slug: true } } },
      },
      media: {
        orderBy: { position: 'asc' },
        select: { id: true, type: true, url: true, alt: true, isPrimary: true },
      },
      variants: {
        orderBy: { position: 'asc' },
        select: { id: true, name: true, swatches: true },
      },
      faqItems: {
        orderBy: { position: 'asc' },
        select: { id: true, question: true, answer: true },
      },
      cities: {
        select: { city: { select: { id: true, name: true, slug: true } } },
      },
      addOns: {
        where: { addOn: { isActive: true } },
        select: {
          addOn: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              category: { select: { id: true, name: true, position: true } },
            },
          },
        },
      },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          adminReply: true,
          createdAt: true,
          user: { select: { name: true } },
          media: { select: { url: true, type: true } },
        },
      },
    },
  });

  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');
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

// "Similar Packages" = other active products sharing a category with this
// one. "You May Also Like" = featured active products outside that category,
// so the two rows don't just repeat each other. Both are real catalog data —
// no fabricated recommendations.
export async function getRelated(slug) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: { id: true, categories: { select: { categoryId: true } } },
  });

  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  const categoryIds = product.categories.map((c) => c.categoryId);

  const [similar, youMayLike] = await Promise.all([
    categoryIds.length > 0
      ? prisma.product.findMany({
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
    prisma.product.findMany({
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
