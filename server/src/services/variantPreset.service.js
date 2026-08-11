import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function list() {
  return prisma.variantPreset.findMany({ orderBy: { name: 'asc' } });
}

export async function getById(id) {
  const preset = await prisma.variantPreset.findUnique({ where: { id } });
  if (!preset) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Attribute preset not found');
  return preset;
}

export async function create(data) {
  return prisma.variantPreset.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.variantPreset.update({ where: { id }, data });
}

export async function remove(id) {
  const preset = await getById(id);
  await prisma.variantPreset.delete({ where: { id } });
  return preset;
}
