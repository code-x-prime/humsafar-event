import * as addressService from '../services/address.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const addresses = await addressService.list(req.user.sub);
  return success(res, { data: addresses, message: 'Addresses fetched' });
};

export const create = async (req, res) => {
  const address = await addressService.create(req.user.sub, req.body);
  return success(res, { status: 201, data: address, message: 'Address saved' });
};

export const update = async (req, res) => {
  const address = await addressService.update(req.user.sub, req.params.id, req.body);
  return success(res, { data: address, message: 'Address updated' });
};

export const remove = async (req, res) => {
  await addressService.remove(req.user.sub, req.params.id);
  return success(res, { message: 'Address deleted' });
};
