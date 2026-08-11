import { prisma } from '../config/db.js';
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

// The home page row itself only ever shows this many products — admins can
// still curate more than this in a section (e.g. for future rotation), but
// the storefront caps each row so no single section dominates the page.
// "View all" on the client links out to the rest.
const HOME_FEED_PRODUCT_CAP = 5;

// Hard cap on how many products a single section can hold at all — keeps the
// admin "add product" list and the home feed query cheap regardless of how
// many products the catalog eventually has.
const MAX_PRODUCTS_PER_SECTION = 15;

const PRODUCT_SELECT = {
  id: true,
  title: true,
  slug: true,
  price: true,
  mrp: true,
  avgRating: true,
  reviewCount: true,
  isActive: true,
  media: { where: { isPrimary: true }, take: 1, select: { url: true } },
};

export async function list() {
  const sections = await prisma.productSection.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return sections;
}

export async function getById(id) {
  const section = await prisma.productSection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: { product: { select: PRODUCT_SELECT } },
      },
    },
  });
  if (!section) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Section not found');
  return section;
}

export async function create(data) {
  const slug = data.slug || slugify(data.name);
  return prisma.productSection.create({ data: { ...data, slug } });
}

export async function update(id, data) {
  await getById(id);
  return prisma.productSection.update({ where: { id }, data });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.productSection.update({ where: { id }, data: { [field]: value } });
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.productSection.update({ where: { id }, data: { position } }))
  );
}

export async function remove(id) {
  const section = await getById(id);
  await prisma.productSection.delete({ where: { id } });
  return section;
}

export async function addProduct(sectionId, productId) {
  await getById(sectionId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  const existing = await prisma.productSectionItem.findUnique({
    where: { productId_sectionId: { productId, sectionId } },
  });
  if (existing) throw apiError(409, ERROR_CODES.CONFLICT, 'Product is already in this section');

  const currentCount = await prisma.productSectionItem.count({ where: { sectionId } });
  if (currentCount >= MAX_PRODUCTS_PER_SECTION) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `A section can hold at most ${MAX_PRODUCTS_PER_SECTION} products`);
  }

  const maxPosition = await prisma.productSectionItem.aggregate({
    where: { sectionId },
    _max: { position: true },
  });

  return prisma.productSectionItem.create({
    data: { sectionId, productId, position: (maxPosition._max.position ?? -1) + 1 },
    include: { product: { select: PRODUCT_SELECT } },
  });
}

export async function removeProduct(sectionId, productId) {
  const existing = await prisma.productSectionItem.findUnique({
    where: { productId_sectionId: { productId, sectionId } },
  });
  if (!existing) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found in this section');

  await prisma.productSectionItem.delete({ where: { productId_sectionId: { productId, sectionId } } });
}

export async function reorderProducts(sectionId, items) {
  await getById(sectionId);
  await prisma.$transaction(
    items.map(({ productId, position }) =>
      prisma.productSectionItem.update({
        where: { productId_sectionId: { productId, sectionId } },
        data: { position },
      })
    )
  );
}

// Replaces a product's section memberships with exactly the given list —
// used by the product form's "Sections" multi-select on create/update.
export async function syncProductSections(productId, sectionIds) {
  if (!sectionIds) return;
  await prisma.productSectionItem.deleteMany({ where: { productId } });
  if (sectionIds.length) {
    await prisma.productSectionItem.createMany({
      data: sectionIds.map((sectionId, position) => ({ productId, sectionId, position })),
    });
  }
}

// GET /api/v1/products/sections — active sections with their active products,
// in position order, for the home page's banner+carousel rows. Capped to
// HOME_FEED_PRODUCT_CAP per row — a section can hold more, but the storefront
// row itself only ever renders the first few.
export async function getPublicSections() {
  const sections = await prisma.productSection.findMany({
    where: { isActive: true },
    orderBy: { position: 'asc' },
    include: {
      products: {
        where: { product: { isActive: true } },
        orderBy: { position: 'asc' },
        take: HOME_FEED_PRODUCT_CAP,
        include: { product: { select: PRODUCT_SELECT } },
      },
    },
  });

  return sections
    .map((section) => ({
      id: section.id,
      name: section.name,
      slug: section.slug,
      position: section.position,
      products: section.products.map((item) => item.product),
    }))
    .filter((section) => section.products.length > 0);
}

// GET /admin/home-feed/order — sections and banners as one combined,
// position-ordered list, for the admin drag-drop UI that arranges them
// together (e.g. banner between section 2 and 3). Both tables share the same
// position numbering space, kept in sync by reorderHomeFeed() below.
export async function listCombinedForOrdering() {
  const [sections, banners] = await Promise.all([
    prisma.productSection.findMany({ include: { _count: { select: { products: true } } } }),
    prisma.homeBanner.findMany(),
  ]);

  const rows = [
    ...sections.map((s) => ({ type: 'section', id: s.id, position: s.position, data: s })),
    ...banners.map((b) => ({ type: 'banner', id: b.id, position: b.position, data: b })),
  ];

  return rows.sort((a, b) => a.position - b.position);
}

// PATCH /admin/home-feed/reorder — accepts the combined list back in its new
// order and rewrites position on whichever table each row belongs to, using
// the row's index in the submitted list as the new shared position value.
export async function reorderHomeFeed(items) {
  await prisma.$transaction(
    items.map(({ type, id, position }) =>
      type === 'banner'
        ? prisma.homeBanner.update({ where: { id }, data: { position } })
        : prisma.productSection.update({ where: { id }, data: { position } })
    )
  );
}

// GET /api/v1/products/home-feed — sections AND banners merged into one
// ordered sequence by `position`, so the client can render them inline in
// whatever order the admin arranged (e.g. banner between section 2 and 3).
export async function getPublicHomeFeed() {
  const [sections, banners] = await Promise.all([
    getPublicSections(),
    prisma.homeBanner.findMany({ where: { isActive: true }, orderBy: { position: 'asc' } }),
  ]);

  const sectionRows = sections.map((s) => ({ type: 'section', position: s.position, data: s }));
  const bannerRows = banners.map((b) => ({
    type: 'banner',
    position: b.position,
    data: {
      id: b.id,
      desktopImage: b.desktopImage,
      mobileImage: b.mobileImage,
      heading: b.heading,
      subtitle: b.subtitle,
      buttonText: b.buttonText,
      link: b.link,
    },
  }));

  return [...sectionRows, ...bannerRows].sort((a, b) => a.position - b.position);
}
