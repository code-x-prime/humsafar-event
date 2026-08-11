import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as cityController from '../../controllers/city.controller.js';
import {
  createCitySchema,
  updateCitySchema,
  listCitiesQuerySchema,
  toggleCitySchema,
  reorderCitiesSchema,
} from '../../validators/city.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listCitiesQuerySchema, 'query'), asyncHandler(cityController.list))
  .post(validate(createCitySchema), asyncHandler(cityController.create));

router.patch('/reorder', validate(reorderCitiesSchema), asyncHandler(cityController.reorder));

router
  .route('/:id')
  .get(asyncHandler(cityController.getById))
  .patch(validate(updateCitySchema), asyncHandler(cityController.update))
  .delete(asyncHandler(cityController.remove));

router.patch('/:id/toggle', validate(toggleCitySchema), asyncHandler(cityController.toggle));
router.get('/:id/stats', asyncHandler(cityController.stats));

export default router;
