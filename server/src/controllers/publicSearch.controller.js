import { search } from '../services/search.service.js';
import { success } from '../utils/apiResponse.js';

export const searchAll = async (req, res) => {
  const results = await search(req.query.q);
  return success(res, { data: results, message: 'Search results fetched' });
};
