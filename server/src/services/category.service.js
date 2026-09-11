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

// Builds a default meta title/description/keywords from the category's own
// name (and parent, for subcategories) and description, so a category always
// has usable SEO fields even when the admin leaves them blank — matching the
// same "auto-generate" behaviour the product form offers.
function deriveMeta({ name, description, parentName }) {
  const title = parentName ? `${name} | ${parentName} Decoration — Humsafar Events` : `${name} Decoration — Humsafar Events`;
  const metaDescription =
    description || `Explore ${name.toLowerCase()} decoration packages from Humsafar Events — themed setups, on-time delivery, trusted styling.`;

  const words = [name, parentName, 'decoration', 'event decoration', 'Humsafar Events']
    .filter(Boolean)
    .flatMap((w) => w.split(/\s+/))
    .map((w) => w.trim())
    .filter(Boolean);
  const seen = new Set();
  const keywords = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(w);
  }

  return { metaTitle: title, metaDescription, metaKeywords: keywords.slice(0, 15).join(', ') };
}

async function safeDeleteR2Object(r2Key) {
  if (!r2Key) return;
  try {
    await deleteObject(r2Key);
  } catch (err) {
    logger.error({ err, r2Key }, 'Failed to delete R2 object during category cleanup');
  }
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['name', 'slug'], filterFields: ['isActive', 'parentId'] });
  const orderBy = buildOrderBy(query, 'position', 'asc');

  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, orderBy, skip, take, include: { _count: { select: { products: true } } } }),
    prisma.category.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } }, children: true },
  });

  if (!category) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Category not found');
  return category;
}

export async function create(data) {
  const slug = data.slug || slugify(data.name);

  let parentName;
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { name: true } });
    parentName = parent?.name;
  }

  const auto = deriveMeta({ name: data.name, description: data.description, parentName });
  const metaTitle = data.metaTitle || auto.metaTitle;
  const metaDescription = data.metaDescription || auto.metaDescription;
  const metaKeywords = data.metaKeywords || auto.metaKeywords;

  return prisma.category.create({ data: { ...data, slug, metaTitle, metaDescription, metaKeywords } });
}

// If the update replaces imageR2Key with a different value (or clears it),
// the previous R2 object is deleted so it doesn't sit orphaned in the bucket.
export async function update(id, data) {
  const existing = await getById(id);

  if ('imageR2Key' in data && data.imageR2Key !== existing.imageR2Key) {
    await safeDeleteR2Object(existing.imageR2Key);
  }

  // An empty string (not undefined — undefined means "leave unchanged") is how
  // the admin's "auto-generate" toggle asks us to recompute the field instead
  // of storing a blank value.
  if (data.metaTitle === '' || data.metaDescription === '' || data.metaKeywords === '') {
    let parentName;
    const parentId = data.parentId !== undefined ? data.parentId : existing.parentId;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { name: true } });
      parentName = parent?.name;
    }
    const auto = deriveMeta({
      name: data.name || existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      parentName,
    });
    if (data.metaTitle === '') data.metaTitle = auto.metaTitle;
    if (data.metaDescription === '') data.metaDescription = auto.metaDescription;
    if (data.metaKeywords === '') data.metaKeywords = auto.metaKeywords;
  }

  return prisma.category.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.category.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.category.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const category = await getById(id);
  const productCount = await prisma.productCategory.count({ where: { categoryId: id } });

  if (productCount > 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, `Category has ${productCount} product(s) and cannot be deleted`);
  }

  await safeDeleteR2Object(category.imageR2Key);
  await prisma.category.delete({ where: { id } });
  return category;
}

const SORT_OPTIONS = {
  popularity: { reviewCount: 'desc' },
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
};

// GET /api/v1/categories/:slug — a category's own detail plus its active
// products, for the client category listing page. `sort` is one of
// popularity|newest|price_asc|price_desc (defaults to popularity); `minPrice`
// /`maxPrice` filter the product price range.
export async function getPublicBySlug(slug, { sort, minPrice, maxPrice } = {}) {
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      parent: { select: { name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, name: true, slug: true, image: true },
      },
    },
  });

  if (!category) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Category not found');

  const priceFilter = {};
  if (minPrice !== undefined) priceFilter.gte = minPrice;
  if (maxPrice !== undefined) priceFilter.lte = maxPrice;

  const categoryProductWhere = { isActive: true, categories: { some: { categoryId: category.id } } };

  const [products, priceStats] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...categoryProductWhere,
        ...(Object.keys(priceFilter).length ? { price: priceFilter } : {}),
      },
      orderBy: SORT_OPTIONS[sort] || { position: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        mrp: true,
        shortDescription: true,
        avgRating: true,
        reviewCount: true,
        createdAt: true,
        media: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    }),
    // Unfiltered min/max across ALL of the category's products, so the price
    // filter buckets on the client reflect the full range regardless of which
    // range (if any) is currently active.
    prisma.product.aggregate({
      where: categoryProductWhere,
      _min: { price: true },
      _max: { price: true },
    }),
  ]);

  return {
    ...category,
    products,
    priceRange: { min: priceStats._min.price, max: priceStats._max.price },
  };
}

// GET /api/v1/categories/menu — active, showInMenu top-level categories with
// their active children and grandchildren (e.g. Birthday → Kids Theme → 15
// sub-themes), for the client Header nav. Deliberately selects no image
// fields — the header does not display category images yet.
export async function getHomeCategories() {
  return prisma.category.findMany({
    where: { isActive: true, showOnHome: true },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      icon: true,
      _count: { select: { products: true } },
    },
  });
}

export async function getPublicTree() {
  return prisma.category.findMany({
    where: { isActive: true, showInMenu: true, parentId: null },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      icon: true,
      children: {
        where: { isActive: true, showInMenu: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          icon: true,
          children: {
            where: { isActive: true, showInMenu: true },
            orderBy: { position: 'asc' },
            select: { id: true, name: true, slug: true, image: true, icon: true },
          },
        },
      },
    },
  });
}
