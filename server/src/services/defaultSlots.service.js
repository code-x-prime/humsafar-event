import { prisma } from '../config/db.js';

// Starter times offered at checkout so a date always comes with times, with no
// setup. They are created once, only while the TimeSlot table is completely
// empty; from then on the admin owns them (Time Slots page: edit, add, switch
// off). Fixed ids make a concurrent first request harmless.
const DEFAULT_SLOTS = [
  { id: 'default_slot_morning', label: 'Morning (9 AM - 12 PM)', startTime: '09:00', endTime: '12:00', position: 1 },
  { id: 'default_slot_afternoon', label: 'Afternoon (12 PM - 3 PM)', startTime: '12:00', endTime: '15:00', position: 2 },
  { id: 'default_slot_evening', label: 'Evening (3 PM - 6 PM)', startTime: '15:00', endTime: '18:00', position: 3 },
  { id: 'default_slot_night', label: 'Night (6 PM - 9 PM)', startTime: '18:00', endTime: '21:00', position: 4 },
];

export async function ensureDefaultSlots() {
  if ((await prisma.timeSlot.count()) > 0) return;
  await prisma.timeSlot.createMany({
    data: DEFAULT_SLOTS.map((s) => ({ ...s, capacity: 3, surgeCharge: 0, isActive: true })),
    skipDuplicates: true,
  });
}
