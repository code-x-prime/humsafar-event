import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { health } from '../../controllers/health.controller.js';

const router = Router();

router.get('/', asyncHandler(health));

export default router;
