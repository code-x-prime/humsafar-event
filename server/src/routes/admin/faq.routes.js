import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as faqController from '../../controllers/faq.controller.js';
import {
  createFaqSchema,
  updateFaqSchema,
  listFaqsQuerySchema,
  reorderFaqsSchema,
} from '../../validators/faq.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listFaqsQuerySchema, 'query'), asyncHandler(faqController.list))
  .post(validate(createFaqSchema), asyncHandler(faqController.create));

router.patch('/reorder', validate(reorderFaqsSchema), asyncHandler(faqController.reorder));

router
  .route('/:id')
  .get(asyncHandler(faqController.getById))
  .patch(validate(updateFaqSchema), asyncHandler(faqController.update))
  .delete(asyncHandler(faqController.remove));

export default router;
