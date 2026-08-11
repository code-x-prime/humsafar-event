import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as notificationController from '../../controllers/notification.controller.js';
import { listNotificationsQuerySchema } from '../../validators/notification.validator.js';

const router = Router();

router.get('/', validate(listNotificationsQuerySchema, 'query'), asyncHandler(notificationController.list));
router.patch('/mark-all-read', asyncHandler(notificationController.markAllRead));
router.patch('/:id/read', asyncHandler(notificationController.markRead));

export default router;
