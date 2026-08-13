import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as galleryController from '../../controllers/gallery.controller.js';
import {
  createGalleryImageSchema,
  updateGalleryImageSchema,
  toggleGalleryImageSchema,
  reorderGalleryImagesSchema,
} from '../../validators/gallery.validator.js';

const router = Router();

router
  .route('/')
  .get(asyncHandler(galleryController.list))
  .post(validate(createGalleryImageSchema), asyncHandler(galleryController.create));

router.patch('/reorder', validate(reorderGalleryImagesSchema), asyncHandler(galleryController.reorder));

router
  .route('/:id')
  .get(asyncHandler(galleryController.getById))
  .patch(validate(updateGalleryImageSchema), asyncHandler(galleryController.update))
  .delete(asyncHandler(galleryController.remove));

router.patch('/:id/toggle', validate(toggleGalleryImageSchema), asyncHandler(galleryController.toggle));

export default router;
