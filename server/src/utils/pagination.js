import { PAGINATION } from '../config/constants.js';

// Reads page/limit from a validated query object and returns Prisma-ready skip/take.
export function getPagination(query = {}) {
  const page = Math.max(PAGINATION.DEFAULT_PAGE, Number(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Number(query.limit) || PAGINATION.DEFAULT_LIMIT)
  );

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildMeta(total, { page, limit }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
