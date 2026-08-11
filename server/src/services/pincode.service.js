import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere } from '../utils/queryBuilder.js';
import { parseCsv, generateCsv } from '../utils/csv.js';
import { invalidateServiceabilityCache } from './location.service.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = {
    ...buildWhere(query, { searchFields: ['code', 'areaName'], filterFields: ['cityId', 'isServiceable'] }),
    deletedAt: null,
  };

  const [items, total] = await Promise.all([
    prisma.pincode.findMany({ where, skip, take, include: { city: true }, orderBy: { code: 'asc' } }),
    prisma.pincode.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function create(data) {
  const existing = await prisma.pincode.findFirst({
    where: { code: data.code, cityId: data.cityId },
  });
  if (existing) throw apiError(409, ERROR_CODES.CONFLICT, 'Pincode already exists for this city');

  const pincode = await prisma.pincode.create({ data });
  invalidateServiceabilityCache();
  return pincode;
}

export async function bulkRange({ cityId, from, to }) {
  const start = Number(from);
  const end = Number(to);
  const padLength = from.length;

  const codes = [];
  for (let n = start; n <= end; n++) {
    codes.push(String(n).padStart(padLength, '0'));
  }

  const existing = await prisma.pincode.findMany({
    where: { cityId, code: { in: codes } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((p) => p.code));
  const toCreate = codes.filter((c) => !existingCodes.has(c));

  if (toCreate.length > 0) {
    await prisma.pincode.createMany({
      data: toCreate.map((code) => ({ code, cityId, isServiceable: true })),
    });
  }

  invalidateServiceabilityCache();
  return { requested: codes.length, created: toCreate.length, skipped: existingCodes.size };
}

const CSV_COLUMNS = ['code', 'city', 'areaName', 'isServiceable', 'extraDeliveryCharge'];

export async function previewImport(csvText) {
  const { rows } = parseCsv(csvText);
  const cities = await prisma.city.findMany({ where: { deletedAt: null } });
  const cityByName = new Map(cities.map((c) => [c.name.toLowerCase(), c]));

  const existingPincodes = await prisma.pincode.findMany({ select: { code: true, cityId: true } });
  const existingKey = new Set(existingPincodes.map((p) => `${p.code}:${p.cityId}`));

  const preview = { added: [], updated: [], skipped: [], invalid: [] };

  for (const row of rows) {
    const city = cityByName.get((row.city || '').toLowerCase());
    const codeValid = /^\d{6}$/.test(row.code || '');

    if (!city || !codeValid) {
      preview.invalid.push({ row, reason: !city ? 'Unknown city' : 'Invalid pincode format' });
      continue;
    }

    const key = `${row.code}:${city.id}`;
    if (existingKey.has(key)) {
      preview.updated.push(row);
    } else {
      preview.added.push({ ...row, cityId: city.id });
    }
  }

  return preview;
}

export async function commitImport(csvText) {
  const preview = await previewImport(csvText);

  if (preview.added.length > 0) {
    await prisma.pincode.createMany({
      data: preview.added.map((row) => ({
        code: row.code,
        cityId: row.cityId,
        areaName: row.areaName || null,
        isServiceable: row.isServiceable !== 'false',
        extraDeliveryCharge: Number(row.extraDeliveryCharge) || 0,
      })),
    });
  }

  invalidateServiceabilityCache();
  return {
    added: preview.added.length,
    updated: preview.updated.length,
    skipped: preview.skipped.length,
    invalid: preview.invalid.length,
  };
}

export async function exportCsv(cityId) {
  const pincodes = await prisma.pincode.findMany({
    where: { deletedAt: null, ...(cityId ? { cityId } : {}) },
    include: { city: true },
  });

  const rows = pincodes.map((p) => ({
    code: p.code,
    city: p.city.name,
    areaName: p.areaName || '',
    isServiceable: p.isServiceable,
    extraDeliveryCharge: Number(p.extraDeliveryCharge),
  }));

  return generateCsv(rows, CSV_COLUMNS);
}

export async function toggle(id, isServiceable) {
  const pincode = await prisma.pincode.update({ where: { id }, data: { isServiceable } });
  invalidateServiceabilityCache();
  return pincode;
}

export async function bulkToggle(ids, isServiceable) {
  const result = await prisma.pincode.updateMany({ where: { id: { in: ids } }, data: { isServiceable } });
  invalidateServiceabilityCache();
  return result;
}

export async function update(id, data) {
  const pincode = await prisma.pincode.update({ where: { id }, data });
  invalidateServiceabilityCache();
  return pincode;
}

export async function remove(id) {
  await prisma.pincode.delete({ where: { id } });
  invalidateServiceabilityCache();
}

export async function bulkDelete(ids) {
  const result = await prisma.pincode.deleteMany({ where: { id: { in: ids } } });
  invalidateServiceabilityCache();
  return result;
}
