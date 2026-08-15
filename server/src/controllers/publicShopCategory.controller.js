import * as shopCategoryService from '../services/shopCategory.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const categories = await shopCategoryService.listPublic();
  return success(res, { data: categories, message: 'Shop categories fetched' });
};
