import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as blogController from '../../controllers/blog.controller.js';
import {
  createBlogSchema,
  updateBlogSchema,
  listBlogsQuerySchema,
  toggleBlogSchema,
} from '../../validators/blog.validator.js';

const router = Router();

router
  .route('/')
  .get(validate(listBlogsQuerySchema, 'query'), asyncHandler(blogController.list))
  .post(validate(createBlogSchema), asyncHandler(blogController.create));

router
  .route('/:id')
  .get(asyncHandler(blogController.getById))
  .patch(validate(updateBlogSchema), asyncHandler(blogController.update))
  .delete(asyncHandler(blogController.remove));

router.patch('/:id/toggle', validate(toggleBlogSchema), asyncHandler(blogController.toggle));

export default router;
