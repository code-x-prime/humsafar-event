import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { getBySlug, sections, homeFeed, related } from '../../controllers/publicProduct.controller.js';

const router = Router();

router.get('/sections', asyncHandler(sections));
router.get('/home-feed', asyncHandler(homeFeed));
router.get('/:slug/related', asyncHandler(related));
router.get('/:slug', asyncHandler(getBySlug));

export default router;
