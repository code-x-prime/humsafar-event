import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { testConnection, checkServiceability } from '../../controllers/shiprocket.controller.js';

const router = Router();

router.get('/test-connection', asyncHandler(testConnection));
router.get('/serviceability', asyncHandler(checkServiceability));

export default router;
