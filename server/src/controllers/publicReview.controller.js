import * as publicReviewService from '../services/publicReview.service.js';
import * as mediaService from '../services/media.service.js';
import { CUSTOMER_REVIEW_FOLDER, detectImageType } from '../services/reviewMedia.helper.js';
import { ERROR_CODES } from '../config/constants.js';
import { success, error } from '../utils/apiResponse.js';

export const submit = async (req, res) => {
  const review = await publicReviewService.submitReview(req.user.sub, req.body);
  return success(res, { status: 201, data: review, message: 'Thanks for your review — it will appear once approved' });
};

export const getReviewable = async (req, res) => {
  const items = await publicReviewService.getReviewableItems(req.user.sub);
  return success(res, { data: items, message: 'Reviewable items fetched' });
};

export const submitOpen = async (req, res) => {
  const review = await publicReviewService.submitOpenReview(req.user?.sub || null, req.body);
  return success(res, { status: 201, data: review, message: 'Thanks for your review — it will appear once our team approves it' });
};

// POST /reviews/upload-image — a photo for a review being written (shared by
// decoration and shop reviews). Open to guests, so it is stricter than the admin
// upload: the file type is decided from the file's own bytes rather than the
// browser's claim, and it is stored apart from every other image in its own
// folder, where a review submission can later pick it up by key.
export const uploadImage = async (req, res) => {
  if (!req.file) {
    return error(res, { status: 422, code: ERROR_CODES.VALIDATION_ERROR, message: 'Photo is required' });
  }

  const contentType = detectImageType(req.file.buffer);
  if (!contentType) {
    return error(res, {
      status: 422,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Only JPG, PNG or WebP photos can be uploaded',
    });
  }

  const media = await mediaService.uploadFile(
    {
      folder: CUSTOMER_REVIEW_FOLDER,
      filename: req.file.originalname,
      contentType,
      size: req.file.size,
      buffer: req.file.buffer,
    },
    null
  );

  return success(res, { status: 201, data: { r2Key: media.r2Key, url: media.url }, message: 'Photo uploaded' });
};
