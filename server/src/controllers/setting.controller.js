import * as settingService from '../services/setting.service.js';
import { success } from '../utils/apiResponse.js';

export const getGroup = async (req, res) => {
  const data = settingService.getGroupMasked(req.params.group.toUpperCase());
  return success(res, { data, message: 'Settings fetched' });
};

export const saveGroup = async (req, res) => {
  const group = req.params.group.toUpperCase();
  const data = await settingService.saveGroup(group, req.body);
  req.auditContext = { entity: 'Setting', entityId: group, after: Object.keys(req.body) };
  return success(res, { data, message: 'Settings saved successfully' });
};
