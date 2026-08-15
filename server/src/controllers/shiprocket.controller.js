import * as shiprocket from '../lib/shiprocket.js';
import * as settings from '../config/settings.service.js';
import { success, error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

// GET /admin/shiprocket/test-connection — lets the admin verify their
// Shiprocket email/password from Settings actually logs in, without having
// to create a real order first.
export const testConnection = async (req, res) => {
  await shiprocket.testConnection();
  return success(res, { data: { ok: true }, message: 'Shiprocket connected successfully' });
};

// GET /admin/shiprocket/serviceability?deliveryPincode=... — a small tool
// the admin can use to check which couriers deliver to a given pincode and
// their estimated rate, using the configured warehouse pincode as pickup.
export const checkServiceability = async (req, res) => {
  const cfg = settings.getGroup('SHIPPING');
  if (!cfg.warehousePincode) {
    return error(res, {
      status: 422,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Set the warehouse pincode in Settings → Shipping first',
    });
  }

  const result = await shiprocket.checkServiceability({
    pickupPincode: cfg.warehousePincode,
    deliveryPincode: req.query.deliveryPincode,
    weightKg: req.query.weightKg ? Number(req.query.weightKg) : undefined,
  });

  return success(res, { data: result, message: 'Serviceability checked' });
};
