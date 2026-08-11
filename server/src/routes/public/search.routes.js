import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { searchAll } from '../../controllers/publicSearch.controller.js';

const router = Router();

router.get('/', asyncHandler(searchAll));

export default router;
