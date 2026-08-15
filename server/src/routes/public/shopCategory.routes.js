import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { list } from '../../controllers/publicShopCategory.controller.js';

const router = Router();

router.get('/', asyncHandler(list));

export default router;
