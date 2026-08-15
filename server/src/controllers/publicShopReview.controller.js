import * as publicShopReviewService from '../services/publicShopReview.service.js';
import { success } from '../utils/apiResponse.js';

export const submit = async (req, res) => {
  const review = await publicShopReviewService.submitReview(req.user.sub, req.body);
  return success(res, { status: 201, data: review, message: 'Thanks for your review — it will appear once approved' });
};

export const getReviewable = async (req, res) => {
  const items = await publicShopReviewService.getReviewableItems(req.user.sub);
  return success(res, { data: items, message: 'Reviewable items fetched' });
};
