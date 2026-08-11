import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as testimonialController from '../../controllers/testimonial.controller.js';
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  listTestimonialsQuerySchema,
  toggleTestimonialSchema,
  reorderTestimonialsSchema,
} from '../../validators/testimonial.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listTestimonialsQuerySchema, 'query'), asyncHandler(testimonialController.list))
  .post(validate(createTestimonialSchema), asyncHandler(testimonialController.create));

router.patch('/reorder', validate(reorderTestimonialsSchema), asyncHandler(testimonialController.reorder));

router
  .route('/:id')
  .get(asyncHandler(testimonialController.getById))
  .patch(validate(updateTestimonialSchema), asyncHandler(testimonialController.update))
  .delete(asyncHandler(testimonialController.remove));

router.patch('/:id/toggle', validate(toggleTestimonialSchema), asyncHandler(testimonialController.toggle));

export default router;
