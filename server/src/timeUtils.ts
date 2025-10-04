import { addWeeks, eachDayOfInterval, getDay, isAfter, isBefore, setHours, setMinutes, startOfDay, startOfWeek, utcToZonedTime } from 'date-fns-tz';
import { add } from 'date-fns';

const timeZone = 'Europe/Budapest';

export function getZonedDate(date: Date | number) {
  return utcToZonedTime(date, timeZone);
}

export function getWeekStart(date: Date | number) {
  const zoned = getZonedDate(date);
  return startOfWeek(zoned, { weekStartsOn: 1 });
}

export function getWeekRange(date: Date | number) {
  const start = getWeekStart(date);
  const end = addWeeks(start, 1);
  return { start, end };
}

export function getOpeningHoursForDay(date: Date) {
  const start = setHours(setMinutes(startOfDay(date), 0), 9);
  const end = setHours(setMinutes(startOfDay(date), 0), 16);
  return { start, end };
}

export function listWorkingDaysOfWeek(weekStart: Date) {
  const end = add(weekStart, { days: 6 });
  return eachDayOfInterval({ start: weekStart, end }).filter((day) => {
    const dow = getDay(day);
    return dow >= 1 && dow <= 5;
  });
}

export function ceilToGrid(minutes: number, grid: number) {
  if (minutes % grid === 0) {
    return minutes;
  }
  return minutes + (grid - (minutes % grid));
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export function isAfterHours(start: number, end: number) {
  const startDate = getZonedDate(start);
  const { end: closing } = getOpeningHoursForDay(startDate);
  const endDate = getZonedDate(end);
  return isAfter(startDate, closing) || isAfter(endDate, closing);
}

export function ensureTomorrowOrLater(target: number) {
  const now = new Date();
  const zonedNow = getZonedDate(now);
  const tomorrow = add(startOfDay(zonedNow), { days: 1 });
  const targetDate = getZonedDate(target);
  return !isBefore(targetDate, tomorrow);
}

export { timeZone };
