import * as shopProductService from '../services/shopProduct.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await shopProductService.listPublic(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Products fetched', meta });
};

export const getBySlug = async (req, res) => {
  const product = await shopProductService.getPublicBySlug(req.params.slug);
  return success(res, { data: product, message: 'Product fetched' });
};
