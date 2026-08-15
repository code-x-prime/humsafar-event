import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { list, getBySlug } from '../../controllers/publicShopProduct.controller.js';
import { listPublicShopProductsQuerySchema } from '../../validators/shopProduct.validator.js';

const router = Router();

router.get('/', validate(listPublicShopProductsQuerySchema, 'query'), asyncHandler(list));
router.get('/:slug', asyncHandler(getBySlug));

export default router;
