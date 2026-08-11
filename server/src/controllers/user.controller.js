import * as userService from '../services/user.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await userService.list(req.validatedQuery || req.query);
  return success(res, { data: items, message: 'Users fetched', meta });
};

export const getById = async (req, res) => {
  const user = await userService.getById(req.params.id);
  return success(res, { data: user, message: 'User fetched' });
};

export const create = async (req, res) => {
  const user = await userService.create(req.body);
  req.auditContext = { entity: 'User', entityId: user.id, after: user };
  return success(res, { status: 201, data: user, message: 'User created successfully' });
};

export const update = async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  req.auditContext = { entity: 'User', entityId: user.id, after: user };
  return success(res, { data: user, message: 'User updated successfully' });
};

export const toggle = async (req, res) => {
  const user = await userService.toggle(req.params.id, req.body.field, req.body.value);
  req.auditContext = { entity: 'User', entityId: user.id, after: user };
  return success(res, { data: user, message: 'User updated successfully' });
};

export const remove = async (req, res) => {
  const user = await userService.remove(req.params.id);
  req.auditContext = { entity: 'User', entityId: user.id, before: user };
  return success(res, { message: 'User deactivated successfully' });
};

export const resendVerification = async (req, res) => {
  const result = await userService.resendVerification(req.params.id);
  req.auditContext = { entity: 'User', entityId: req.params.id };
  return success(res, { data: result, message: 'Verification code sent' });
};

export const resetPassword = async (req, res) => {
  const result = await userService.resetPassword(req.params.id);
  req.auditContext = { entity: 'User', entityId: req.params.id };
  return success(res, { data: result, message: 'New password emailed to the user' });
};

export const reactivate = async (req, res) => {
  const user = await userService.reactivate(req.params.id);
  req.auditContext = { entity: 'User', entityId: user.id, after: user };
  return success(res, { data: user, message: 'User reactivated successfully' });
};
