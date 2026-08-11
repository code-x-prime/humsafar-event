import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as settingController from '../../controllers/setting.controller.js';
import { saveGroupSchema } from '../../validators/setting.validator.js';

const router = Router();

router
  .route('/:group')
  .get(asyncHandler(settingController.getGroup))
  .put(validate(saveGroupSchema), asyncHandler(settingController.saveGroup));

export default router;
