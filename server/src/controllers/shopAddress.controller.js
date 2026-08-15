import * as shopAddressService from '../services/shopAddress.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const addresses = await shopAddressService.list(req.user.sub);
  return success(res, { data: addresses, message: 'Addresses fetched' });
};

export const create = async (req, res) => {
  const address = await shopAddressService.create(req.user.sub, req.body);
  return success(res, { status: 201, data: address, message: 'Address saved' });
};

export const update = async (req, res) => {
  const address = await shopAddressService.update(req.user.sub, req.params.id, req.body);
  return success(res, { data: address, message: 'Address updated' });
};

export const remove = async (req, res) => {
  await shopAddressService.remove(req.user.sub, req.params.id);
  return success(res, { message: 'Address deleted' });
};
