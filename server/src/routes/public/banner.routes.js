import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { listActive } from '../../controllers/publicBanner.controller.js';

const router = Router();

router.get('/', asyncHandler(listActive));

export default router;
