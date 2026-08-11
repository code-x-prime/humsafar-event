// Builds a Prisma `where` clause from a validated query object.
//
// - `search` -> case-insensitive `contains` across `searchFields`
// - any key in `filterFields` present in the query -> exact match
// - `sortBy`/`sortOrder` -> Prisma `orderBy`
export function buildWhere(query = {}, { searchFields = [], filterFields = [] } = {}) {
  const where = {};

  if (query.search && searchFields.length > 0) {
    where.OR = searchFields.map((field) => ({
      [field]: { contains: query.search, mode: 'insensitive' },
    }));
  }

  for (const field of filterFields) {
    if (query[field] !== undefined && query[field] !== '') {
      where[field] = query[field];
    }
  }

  return where;
}

export function buildOrderBy(query = {}, defaultField = 'createdAt', defaultOrder = 'desc') {
  const sortBy = query.sortBy || defaultField;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : query.sortOrder === 'desc' ? 'desc' : defaultOrder;
  return { [sortBy]: sortOrder };
}
