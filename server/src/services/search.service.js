import { prisma } from '../config/db.js';

const MIN_QUERY_LENGTH = 2;

// Powers the header search box: category name matches + product title matches,
// run in parallel, capped to a small result count for a dropdown UI.
export async function search(query) {
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    return { categories: [], products: [] };
  }

  const term = query.trim();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, name: { contains: term, mode: 'insensitive' } },
      orderBy: { position: 'asc' },
      take: 5,
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.findMany({
      where: { isActive: true, title: { contains: term, mode: 'insensitive' } },
      orderBy: { position: 'asc' },
      take: 8,
      select: { id: true, title: true, slug: true, price: true },
    }),
  ]);

  return { categories, products };
}
