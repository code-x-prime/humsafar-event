import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as dashboardController from '../../controllers/dashboard.controller.js';

const router = Router();

router.get('/', asyncHandler(dashboardController.getOverview));
router.get('/timeseries', asyncHandler(dashboardController.getTimeseries));

export default router;
