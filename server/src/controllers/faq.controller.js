import * as faqService from '../services/faq.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await faqService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'FAQs fetched', meta });
};

export const getById = async (req, res) => {
  const faq = await faqService.getById(req.params.id);
  return success(res, { data: faq, message: 'FAQ fetched' });
};

export const create = async (req, res) => {
  const faq = await faqService.create(req.body);
  req.auditContext = { entity: 'FaqItem', entityId: faq.id, after: faq };
  return success(res, { status: 201, data: faq, message: 'FAQ created successfully' });
};

export const update = async (req, res) => {
  const faq = await faqService.update(req.params.id, req.body);
  req.auditContext = { entity: 'FaqItem', entityId: faq.id, after: faq };
  return success(res, { data: faq, message: 'FAQ updated successfully' });
};

export const reorder = async (req, res) => {
  await faqService.reorder(req.body.items);
  req.auditContext = { entity: 'FaqItem', entityId: 'bulk-reorder' };
  return success(res, { message: 'FAQs reordered successfully' });
};

export const remove = async (req, res) => {
  const faq = await faqService.remove(req.params.id);
  req.auditContext = { entity: 'FaqItem', entityId: faq.id, before: faq };
  return success(res, { message: 'FAQ deleted successfully' });
};
