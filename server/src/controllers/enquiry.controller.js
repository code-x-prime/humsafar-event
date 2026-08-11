import * as enquiryService from '../services/enquiry.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await enquiryService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Enquiries fetched', meta });
};

export const getById = async (req, res) => {
  const enquiry = await enquiryService.getById(req.params.id);
  return success(res, { data: enquiry, message: 'Enquiry fetched' });
};

export const create = async (req, res) => {
  const enquiry = await enquiryService.create(req.body);
  req.auditContext = { entity: 'Enquiry', entityId: enquiry.id, after: enquiry };
  return success(res, { status: 201, data: enquiry, message: 'Enquiry created successfully' });
};

export const update = async (req, res) => {
  const enquiry = await enquiryService.update(req.params.id, req.body);
  req.auditContext = { entity: 'Enquiry', entityId: enquiry.id, after: enquiry };
  return success(res, { data: enquiry, message: 'Enquiry updated successfully' });
};

export const remove = async (req, res) => {
  const enquiry = await enquiryService.remove(req.params.id);
  req.auditContext = { entity: 'Enquiry', entityId: enquiry.id, before: enquiry };
  return success(res, { message: 'Enquiry deleted successfully' });
};
