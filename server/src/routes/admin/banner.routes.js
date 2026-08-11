import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as bannerController from '../../controllers/banner.controller.js';
import {
  createBannerSchema,
  updateBannerSchema,
  listBannersQuerySchema,
  toggleBannerSchema,
  reorderBannersSchema,
} from '../../validators/banner.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listBannersQuerySchema, 'query'), asyncHandler(bannerController.list))
  .post(validate(createBannerSchema), asyncHandler(bannerController.create));

router.patch('/reorder', validate(reorderBannersSchema), asyncHandler(bannerController.reorder));

router
  .route('/:id')
  .get(asyncHandler(bannerController.getById))
  .patch(validate(updateBannerSchema), asyncHandler(bannerController.update))
  .delete(asyncHandler(bannerController.remove));

router.patch('/:id/toggle', validate(toggleBannerSchema), asyncHandler(bannerController.toggle));

export default router;
