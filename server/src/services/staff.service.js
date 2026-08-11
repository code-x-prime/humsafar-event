import { prisma } from '../config/db.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import { buildWhere, buildOrderBy } from '../utils/queryBuilder.js';
import { ADMIN_ROLES, ERROR_CODES } from '../config/constants.js';
import { hashPassword } from '../utils/password.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function list(query) {
  const { page, limit, skip, take } = getPagination(query);
  const where = {
    ...buildWhere(query, { searchFields: ['name', 'email', 'phone'], filterFields: ['isActive', 'role'] }),
    role: { in: ADMIN_ROLES },
  };
  const orderBy = buildOrderBy(query, 'createdAt', 'desc');

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy, skip, take, select: SELECT }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildMeta(total, { page, limit }) };
}

export async function getById(id) {
  const staff = await prisma.user.findFirst({ where: { id, role: { in: ADMIN_ROLES } }, select: SELECT });
  if (!staff) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Staff member not found');
  return staff;
}

export async function create(data) {
  const { password, ...rest } = data;
  const passwordHash = await hashPassword(password);
  return prisma.user.create({ data: { ...rest, passwordHash }, select: SELECT });
}

export async function update(id, data) {
  await getById(id);
  const { password, ...rest } = data;
  const updateData = { ...rest };
  if (password) updateData.passwordHash = await hashPassword(password);
  return prisma.user.update({ where: { id }, data: updateData, select: SELECT });
}

export async function toggle(id, field, value) {
  await getById(id);
  return prisma.user.update({ where: { id }, data: { [field]: value }, select: SELECT });
}

export async function remove(id) {
  const staff = await getById(id);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return staff;
}
