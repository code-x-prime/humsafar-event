import { prisma } from '../config/db.js';
import { success } from '../utils/apiResponse.js';

// Minimal slug + updatedAt listing for the client's sitemap.xml generator —
// intentionally separate from the paginated admin/list endpoints so it stays
// cheap even as the catalog grows (no relations, no pagination needed).
export const list = async (req, res) => {
  const [products, categories, cities] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.city.findMany({
      where: { deletedAt: null },
      select: { slug: true },
    }),
  ]);

  return success(res, {
    data: { products, categories, cities },
    message: 'Sitemap data fetched',
  });
};
