import { getPublicTestimonials } from '../services/testimonial.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const data = await getPublicTestimonials();
  return success(res, { data, message: 'Testimonials fetched' });
};
