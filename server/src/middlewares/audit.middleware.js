import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const ACTION_BY_METHOD = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

// Fires after a mutating admin request completes successfully. Captures the
// route path as the entity name (good enough until modules report their own
// entity/before/after payloads via req.auditContext).
export function auditMiddleware(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const entity = req.auditContext?.entity || req.baseUrl.replace('/api/v1/admin/', '') || 'unknown';

    prisma.auditLog
      .create({
        data: {
          userId: req.user?.sub || null,
          action: ACTION_BY_METHOD[req.method] || 'UPDATE',
          entity,
          entityId: req.auditContext?.entityId || req.params?.id || null,
          before: req.auditContext?.before ?? undefined,
          after: req.auditContext?.after ?? undefined,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || null,
        },
      })
      .catch((err) => logger.error({ err }, 'Failed to write audit log'));
  });

  return next();
}
