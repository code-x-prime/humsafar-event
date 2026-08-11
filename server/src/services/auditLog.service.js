import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';

// Read-only — AuditLog rows are written by audit.middleware.js, never through
// this API.
export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = buildWhere(query, { searchFields: ['entityId'], filterFields: ['entity', 'action', 'userId'] });
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}
