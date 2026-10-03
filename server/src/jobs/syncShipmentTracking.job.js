import { logger } from '../config/logger.js';
import { syncActiveShipments } from '../services/shopShipment.service.js';

// Checks Shiprocket for the latest status of every Shop With Us parcel that is
// still on its way, so orders flip to DELIVERED (and the customer gets their
// "delivered" email) without anyone having to press "Refresh Tracking".
export async function syncShipmentTracking() {
  const { checked } = await syncActiveShipments();
  if (checked > 0) logger.info({ checked }, 'Synced shipment tracking');
}
