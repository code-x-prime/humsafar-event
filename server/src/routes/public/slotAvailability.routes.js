import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as slotAvailabilityController from '../../controllers/slotAvailability.controller.js';
import { getAvailabilityQuerySchema } from '../../validators/slotAvailability.validator.js';

const router = Router();

router.get('/availability', validate(getAvailabilityQuerySchema, 'query'), asyncHandler(slotAvailabilityController.getAvailability));

export default router;
