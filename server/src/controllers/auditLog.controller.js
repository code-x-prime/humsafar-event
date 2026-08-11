import * as auditLogService from '../services/auditLog.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await auditLogService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Audit logs fetched', meta });
};
