import { getPublicBySlug, getRelated } from '../services/product.service.js';
import { getPublicSections, getPublicHomeFeed } from '../services/section.service.js';
import { success } from '../utils/apiResponse.js';

export const sections = async (req, res) => {
  const data = await getPublicSections();
  return success(res, { data, message: 'Product sections fetched' });
};

export const homeFeed = async (req, res) => {
  const data = await getPublicHomeFeed();
  return success(res, { data, message: 'Home feed fetched' });
};

export const getBySlug = async (req, res) => {
  const product = await getPublicBySlug(req.params.slug);
  return success(res, { data: product, message: 'Product fetched' });
};

export const related = async (req, res) => {
  const data = await getRelated(req.params.slug);
  return success(res, { data, message: 'Related products fetched' });
};
