import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuth, verifyJWT } from '../../middlewares/auth.middleware.js';
import { reviewRateLimiter, reviewUploadRateLimiter } from '../../middlewares/rateLimit.middleware.js';
import * as publicReviewController from '../../controllers/publicReview.controller.js';
import { submitReviewSchema, openReviewSchema } from '../../validators/publicReview.validator.js';
import { error } from '../../utils/apiResponse.js';
import { ERROR_CODES } from '../../config/constants.js';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// Turns multer's own errors (file too large, etc.) into a normal 422 the form
// can show, instead of an unhandled 500.
function singlePhoto(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    return error(res, {
      status: 422,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'That photo is too large (max 5MB)' : 'Could not read that photo',
    });
  });
}

// Product-page review: open to guests too (optionalAuth only attaches the user
// when a valid token is sent). These must come before the verifyJWT wall below.
router.post('/open', reviewRateLimiter, optionalAuth, validate(openReviewSchema), asyncHandler(publicReviewController.submitOpen));
router.post('/upload-image', reviewUploadRateLimiter, singlePhoto, asyncHandler(publicReviewController.uploadImage));

router.use(verifyJWT);

router.post('/', validate(submitReviewSchema), asyncHandler(publicReviewController.submit));
router.get('/reviewable', asyncHandler(publicReviewController.getReviewable));

export default router;
