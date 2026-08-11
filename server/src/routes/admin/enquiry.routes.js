import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as enquiryController from '../../controllers/enquiry.controller.js';
import {
  createEnquirySchema,
  updateEnquirySchema,
  listEnquiriesQuerySchema,
} from '../../validators/enquiry.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listEnquiriesQuerySchema, 'query'), asyncHandler(enquiryController.list))
  .post(validate(createEnquirySchema), asyncHandler(enquiryController.create));

router
  .route('/:id')
  .get(asyncHandler(enquiryController.getById))
  .patch(validate(updateEnquirySchema), asyncHandler(enquiryController.update))
  .delete(asyncHandler(enquiryController.remove));

export default router;
