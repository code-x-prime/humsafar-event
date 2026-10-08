import dayjs from 'dayjs';
import { nowIST } from './datetime.js';
import { env } from '../config/env.js';
import * as settings from '../config/settings.service.js';

// How far ahead of a slot's start time bookings close — a decoration team needs
// time to get ready, so today's slots stop being offered a few hours early.
// Anything on a later day is unaffected.
const DEFAULT_SLOT_LEAD_HOURS = 3;

export function slotLeadHours() {
  const configured = Number(settings.get('slotLeadHours'));
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_SLOT_LEAD_HOURS;
}

// `date` is the event date (a Date at UTC midnight, or "YYYY-MM-DD"), `startTime`
// is the slot's "HH:mm" in IST. True once that slot is too close (or past) to book.
export function isSlotTooSoon(date, startTime) {
  const day = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const start = dayjs.tz(`${day} ${startTime}`, env.TIMEZONE);
  return start.diff(nowIST(), 'hour', true) < slotLeadHours();
}
