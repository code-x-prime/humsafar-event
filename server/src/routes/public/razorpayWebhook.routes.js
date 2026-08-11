import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { handleWebhook } from '../../controllers/razorpayWebhook.controller.js';

const router = Router();

router.post('/', asyncHandler(handleWebhook));

export default router;
