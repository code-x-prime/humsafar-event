import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { list } from '../../controllers/publicTestimonial.controller.js';

const router = Router();

router.get('/', asyncHandler(list));

export default router;
