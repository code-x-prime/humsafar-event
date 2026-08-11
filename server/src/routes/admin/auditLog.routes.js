import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as auditLogController from '../../controllers/auditLog.controller.js';
import { listAuditLogsQuerySchema } from '../../validators/auditLog.validator.js';

const router = Router();

router.get('/', validate(listAuditLogsQuerySchema, 'query'), asyncHandler(auditLogController.list));

export default router;
