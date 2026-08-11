import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { create } from '../../controllers/publicEnquiry.controller.js';
import { createPublicEnquirySchema } from '../../validators/enquiry.validator.js';

const router = Router();

router.post('/', validate(createPublicEnquirySchema), asyncHandler(create));

export default router;
