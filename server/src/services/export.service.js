import { generateCsv } from '../utils/csv.js';
import * as cityService from './city.service.js';
import * as pincodeService from './pincode.service.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Supported models today: 'cities', 'pincodes'. Add more by wiring in the
// corresponding service's list() and a column list, following the same
// pattern below — no schema changes needed.
const EXPORTERS = {
  cities: {
    columns: ['id', 'name', 'slug', 'state', 'region', 'isServiceable', 'comingSoon'],
    fetch: (filters) => cityService.list({ ...filters, limit: 10000 }),
  },
  pincodes: {
    columns: ['id', 'code', 'cityId', 'areaName', 'isServiceable', 'extraDeliveryCharge'],
    fetch: (filters) => pincodeService.list({ ...filters, limit: 10000 }),
  },
};

export async function exportCsv(model, filters = {}) {
  const exporter = EXPORTERS[model];
  if (!exporter) throw apiError(400, ERROR_CODES.VALIDATION_ERROR, `Export model '${model}' is not supported`);

  const { items } = await exporter.fetch(filters);
  return generateCsv(items, exporter.columns);
}
