import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as publicCityController from '../../controllers/publicCity.controller.js';

const router = Router();

router.get('/', asyncHandler(publicCityController.listPublic));
router.get('/detect', asyncHandler(publicCityController.detect));
router.get('/:slug', asyncHandler(publicCityController.getBySlug));

export default router;
