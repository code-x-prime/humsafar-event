import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as bannerController from '../../controllers/homeBanner.controller.js';
import {
  createHomeBannerSchema,
  updateHomeBannerSchema,
  toggleHomeBannerSchema,
  reorderHomeBannersSchema,
} from '../../validators/homeBanner.validator.js';

const router = Router();

router
  .route('/')
  .get(asyncHandler(bannerController.list))
  .post(validate(createHomeBannerSchema), asyncHandler(bannerController.create));

router.patch('/reorder', validate(reorderHomeBannersSchema), asyncHandler(bannerController.reorder));

router
  .route('/:id')
  .get(asyncHandler(bannerController.getById))
  .patch(validate(updateHomeBannerSchema), asyncHandler(bannerController.update))
  .delete(asyncHandler(bannerController.remove));

router.patch('/:id/toggle', validate(toggleHomeBannerSchema), asyncHandler(bannerController.toggle));

export default router;
