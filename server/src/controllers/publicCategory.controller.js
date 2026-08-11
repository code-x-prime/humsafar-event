import { getPublicTree, getPublicBySlug, getHomeCategories } from '../services/category.service.js';
import { success } from '../utils/apiResponse.js';

export const menu = async (req, res) => {
  const tree = await getPublicTree();
  return success(res, { data: tree, message: 'Category menu fetched' });
};

export const home = async (req, res) => {
  const categories = await getHomeCategories();
  return success(res, { data: categories, message: 'Home categories fetched' });
};

export const getBySlug = async (req, res) => {
  const { sort, minPrice, maxPrice } = req.query;
  const category = await getPublicBySlug(req.params.slug, {
    sort,
    minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
    maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
  });
  return success(res, { data: category, message: 'Category fetched' });
};
