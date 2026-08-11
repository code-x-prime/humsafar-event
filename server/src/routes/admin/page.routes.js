import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as pageController from '../../controllers/page.controller.js';
import {
  createPageSchema,
  updatePageSchema,
  listPagesQuerySchema,
  togglePageSchema,
} from '../../validators/page.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listPagesQuerySchema, 'query'), asyncHandler(pageController.list))
  .post(validate(createPageSchema), asyncHandler(pageController.create));

router
  .route('/:id')
  .get(asyncHandler(pageController.getById))
  .patch(validate(updatePageSchema), asyncHandler(pageController.update))
  .delete(asyncHandler(pageController.remove));

router.patch('/:id/toggle', validate(togglePageSchema), asyncHandler(pageController.toggle));

export default router;
