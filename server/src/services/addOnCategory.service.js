import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function list() {
  return prisma.addOnCategory.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { addOns: true } } },
  });
}

export async function getById(id) {
  const category = await prisma.addOnCategory.findUnique({ where: { id } });
  if (!category) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Add-on category not found');
  return category;
}

export async function create(data) {
  return prisma.addOnCategory.create({ data });
}

export async function update(id, data) {
  await getById(id);
  return prisma.addOnCategory.update({ where: { id }, data });
}

export async function remove(id) {
  const category = await getById(id);
  const addOnCount = await prisma.addOn.count({ where: { categoryId: id } });

  if (addOnCount > 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, `This category has ${addOnCount} add-on(s) and cannot be deleted`);
  }

  await prisma.addOnCategory.delete({ where: { id } });
  return category;
}

export async function reorder(items) {
  await prisma.$transaction(
    items.map(({ id, position }) => prisma.addOnCategory.update({ where: { id }, data: { position } }))
  );
}
