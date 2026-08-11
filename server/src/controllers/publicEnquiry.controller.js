import * as enquiryService from '../services/enquiry.service.js';
import { success } from '../utils/apiResponse.js';
import { sendMail } from '../lib/email/index.js';
import { logger } from '../config/logger.js';
import * as settings from '../config/settings.service.js';

export const create = async (req, res) => {
  const enquiry = await enquiryService.create({ ...req.body, source: req.body.source || 'CONTACT' });

  const notifyEmail = settings.get('orderNotifyEmail');
  if (notifyEmail) {
    sendMail({
      to: notifyEmail,
      template: 'enquiry-notification-admin',
      subject: `New contact message from ${enquiry.name}`,
      data: enquiry,
    }).catch((err) => logger.error({ err, enquiryId: enquiry.id }, 'Failed to email admin enquiry notification'));
  }

  return success(res, { status: 201, data: { id: enquiry.id }, message: 'Thanks — we received your message' });
};
