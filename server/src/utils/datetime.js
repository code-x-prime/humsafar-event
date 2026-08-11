import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { env } from '../config/env.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = env.TIMEZONE;

// Current time in IST.
export function nowIST() {
  return dayjs().tz(IST);
}

// Parse any date-like input as IST.
export function toIST(input) {
  return dayjs(input).tz(IST);
}

// Convert an IST-intended date/time to a UTC Date for storage.
export function istToUtcDate(input) {
  return dayjs.tz(input, IST).utc().toDate();
}

// Format a stored UTC date for IST display.
export function formatIST(input, format = 'YYYY-MM-DD HH:mm') {
  return dayjs(input).tz(IST).format(format);
}

// Hours between now (IST) and a given date/time.
export function hoursUntil(input) {
  return dayjs(input).tz(IST).diff(nowIST(), 'hour', true);
}

// Current instant as a UTC Date — the only sanctioned replacement for raw `new Date()`.
export function nowUTC() {
  return dayjs.utc().toDate();
}
