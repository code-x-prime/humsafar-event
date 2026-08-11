import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { check } from '../../controllers/pincode.controller.js';

const router = Router();

router.get('/check', asyncHandler(check));

export default router;
