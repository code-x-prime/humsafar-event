import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as mediaController from '../../controllers/media.controller.js';
import {
  createMediaSchema,
  updateMediaSchema,
  listMediaQuerySchema,
  presignSchema,
  confirmUploadSchema,
} from '../../validators/media.validator.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.post('/upload', upload.single('file'), asyncHandler(mediaController.upload));
router.post('/presign', validate(presignSchema), asyncHandler(mediaController.presign));
router.post('/confirm', validate(confirmUploadSchema), asyncHandler(mediaController.confirm));

router
  .route('/')
  .get(validate(listMediaQuerySchema, 'query'), asyncHandler(mediaController.list))
  .post(validate(createMediaSchema), asyncHandler(mediaController.create));

router
  .route('/:id')
  .get(asyncHandler(mediaController.getById))
  .patch(validate(updateMediaSchema), asyncHandler(mediaController.update))
  .delete(asyncHandler(mediaController.remove));

export default router;
