import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { menu, home, getBySlug } from '../../controllers/publicCategory.controller.js';

const router = Router();

router.get('/menu', asyncHandler(menu));
router.get('/home', asyncHandler(home));
router.get('/:slug', asyncHandler(getBySlug));

export default router;
