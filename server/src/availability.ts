import { dbPromise } from './db';
import { DurationConfigPayload } from './types';
import { getWeekStart, listWorkingDaysOfWeek, getOpeningHoursForDay, ceilToGrid, overlaps } from './timeUtils';
import { addMinutes } from 'date-fns';

export interface AvailabilityParams {
  weekStart: number;
  durationMinutes: number;
  includeAdminOnly?: boolean;
}

export interface SlotEntry {
  start: number;
  end: number;
  status: 'available' | 'booked' | 'blocked';
}

export async function getDurationConfig(): Promise<DurationConfigPayload> {
  const db = await dbPromise;
  const row = await db.get(`SELECT payload FROM duration_config WHERE id = 1`);
  return JSON.parse(row.payload);
}

export async function setDurationConfig(payload: DurationConfigPayload) {
  const db = await dbPromise;
  await db.run(`UPDATE duration_config SET payload = ? WHERE id = 1`, JSON.stringify(payload));
}

export async function getAvailability({ weekStart, durationMinutes, includeAdminOnly = false }: AvailabilityParams) {
  const db = await dbPromise;
  const config = await getDurationConfig();
  const grid = config.timeGridMinutes || 15;
  const weekStartDate = new Date(weekStart);
  const normalizedStart = getWeekStart(weekStartDate);
  const days = listWorkingDaysOfWeek(normalizedStart);
  const result: Record<string, SlotEntry[]> = {};

  const dayStart = normalizedStart.getTime();
  const dayEnd = addMinutes(normalizedStart, 7 * 24 * 60).getTime();

  const bookings = await db.all(
    `SELECT * FROM bookings WHERE cancelled = 0 AND start < ? AND end > ?`,
    dayEnd,
    dayStart,
  );
  const blocks = await db.all(
    `SELECT * FROM blocks WHERE start < ? AND end > ?`,
    dayEnd,
    dayStart,
  );

  for (const day of days) {
    const key = day.toISOString();
    const slots: SlotEntry[] = [];
    const { start: open, end: close } = getOpeningHoursForDay(day);
    const startTs = open.getTime();
    const endTs = close.getTime();
    let cursor = startTs;
    while (cursor + durationMinutes * 60_000 <= endTs) {
      const slotEnd = cursor + durationMinutes * 60_000;
      const dayBookings = bookings.filter((b) => {
        if (!includeAdminOnly && b.adminOnly) {
          return false;
        }
        return overlaps(cursor, slotEnd, b.start, b.end);
      });
      const dayBlocks = blocks.filter((block) => {
        if (!includeAdminOnly && block.adminOnly) {
          return false;
        }
        return overlaps(cursor, slotEnd, block.start, block.end);
      });
      if (dayBookings.length > 0) {
        slots.push({ start: cursor, end: slotEnd, status: 'booked' });
      } else if (dayBlocks.length > 0) {
        slots.push({ start: cursor, end: slotEnd, status: 'blocked' });
      } else {
        slots.push({ start: cursor, end: slotEnd, status: 'available' });
      }
      cursor += grid * 60_000;
    }
    result[key] = slots;
  }
  return result;
}

export function calculateTotalDuration(
  config: DurationConfigPayload,
  services: string[],
  hairLength: string,
  hairDensity: string,
) {
  const grid = config.timeGridMinutes;
  const durations = config.durations?.[hairLength]?.[hairDensity] || {};
  const total = services.reduce((sum, service) => {
    const value = durations[service];
    return sum + (value || 0);
  }, 0);
  return ceilToGrid(total, grid);
}
