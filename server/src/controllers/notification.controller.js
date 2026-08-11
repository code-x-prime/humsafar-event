import * as notificationService from '../services/notification.service.js';
import { success } from '../utils/apiResponse.js';

export const list = async (req, res) => {
  const { items, meta } = await notificationService.list(req.validatedQuery || req.query, req.user.sub);
  return success(res, { data: items, message: 'Notifications fetched', meta });
};

export const markRead = async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.user.sub);
  req.auditContext = { entity: 'Notification', entityId: notification.id, after: notification };
  return success(res, { data: notification, message: 'Notification marked as read' });
};

export const markAllRead = async (req, res) => {
  const result = await notificationService.markAllRead(req.user.sub);
  req.auditContext = { entity: 'Notification', entityId: 'bulk-mark-read', after: result };
  return success(res, { data: result, message: 'All notifications marked as read' });
};
