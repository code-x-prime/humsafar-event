import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as exportController from '../../controllers/export.controller.js';
import { exportQuerySchema } from '../../validators/export.validator.js';

const router = Router();

router.get('/', validate(exportQuerySchema, 'query'), asyncHandler(exportController.exportCsv));

export default router;
