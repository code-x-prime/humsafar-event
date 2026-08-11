import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowIST } from '../utils/datetime.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// GET /slots/availability?cityId=&date=YYYY-MM-DD — every active slot for
// that city (or a city-agnostic slot), with how many bookings/holds already
// exist against it so the client can grey out full or blacked-out slots.
export async function getAvailability(cityId, dateStr) {
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw apiError(404, ERROR_CODES.NOT_FOUND, 'City not found');

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Invalid date');
  }

  const today = nowIST().startOf('day').toDate();
  if (date < today) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Cannot book a date in the past');
  }

  const [slots, bookings, holds, blackouts] = await Promise.all([
    prisma.timeSlot.findMany({
      where: { isActive: true, OR: [{ cityId }, { cityId: null }] },
      orderBy: { position: 'asc' },
    }),
    prisma.slotBooking.findMany({ where: { date, cityId } }),
    prisma.slotHold.findMany({ where: { date, cityId, status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
    prisma.slotBlackout.findMany({ where: { date, OR: [{ cityId }, { cityId: null }] } }),
  ]);

  const bookedBySlot = new Map(bookings.map((b) => [b.timeSlotId, b.bookedCount]));
  const heldBySlot = new Map();
  for (const hold of holds) {
    heldBySlot.set(hold.timeSlotId, (heldBySlot.get(hold.timeSlotId) || 0) + 1);
  }
  const blackedOutSlotIds = new Set(blackouts.filter((b) => b.timeSlotId).map((b) => b.timeSlotId));
  const fullyBlackedOut = blackouts.some((b) => !b.timeSlotId);

  return slots.map((slot) => {
    const taken = (bookedBySlot.get(slot.id) || 0) + (heldBySlot.get(slot.id) || 0);
    const remaining = Math.max(0, slot.capacity - taken);
    const isBlackedOut = fullyBlackedOut || blackedOutSlotIds.has(slot.id);

    return {
      id: slot.id,
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      surgeCharge: slot.surgeCharge,
      available: !isBlackedOut && remaining > 0,
      remaining,
    };
  });
}
