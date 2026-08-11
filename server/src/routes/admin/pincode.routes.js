import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as pincodeController from '../../controllers/pincode.controller.js';
import {
  createPincodeSchema,
  updatePincodeSchema,
  listPincodesQuerySchema,
  bulkRangeSchema,
  bulkToggleSchema,
  bulkDeleteSchema,
} from '../../validators/pincode.validator.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();

router
  .route('/')
  .get(validate(listPincodesQuerySchema, 'query'), asyncHandler(pincodeController.list))
  .post(validate(createPincodeSchema), asyncHandler(pincodeController.create));

router.post('/bulk', validate(bulkRangeSchema), asyncHandler(pincodeController.bulkRange));
router.post('/import/preview', upload.single('file'), asyncHandler(pincodeController.previewImport));
router.post('/import/commit', upload.single('file'), asyncHandler(pincodeController.commitImport));
router.get('/export', asyncHandler(pincodeController.exportCsv));

router.patch('/bulk-toggle', validate(bulkToggleSchema), asyncHandler(pincodeController.bulkToggle));
router.delete('/bulk', validate(bulkDeleteSchema), asyncHandler(pincodeController.bulkDelete));

router
  .route('/:id')
  .patch(validate(updatePincodeSchema), asyncHandler(pincodeController.update))
  .delete(asyncHandler(pincodeController.remove));

router.patch('/:id/toggle', asyncHandler(pincodeController.toggle));

export default router;
