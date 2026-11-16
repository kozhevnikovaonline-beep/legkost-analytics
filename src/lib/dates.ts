/**
 * Даты в Europe/Moscow. В Москве нет перехода на летнее время (UTC+3 круглый год),
 * поэтому смещение фиксированное и считать можно без tz-базы.
 */
import type { ISODate, ISODateTime } from "../types/domain.ts";

export const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Календарный день в Москве для момента времени */
export function mskDay(at: ISODateTime | number): ISODate {
  const ms = typeof at === "number" ? at : Date.parse(at);
  return new Date(ms + MSK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Начало московского дня (полночь МСК) в миллисекундах UTC */
export function mskDayStart(day: ISODate): number {
  return Date.parse(`${day}T00:00:00Z`) - MSK_OFFSET_MS;
}

/** Сдвиг дня на n суток */
export function addDays(day: ISODate, n: number): ISODate {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Количество дней между датами (to − from) */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** День недели в Москве: 0 — понедельник … 6 — воскресенье */
export function mskWeekday(day: ISODate): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** Месяц "YYYY-MM" для дня или момента времени (по Москве) */
export function mskMonth(at: ISODate | ISODateTime): string {
  return at.length === 10 ? at.slice(0, 7) : mskDay(at).slice(0, 7);
}

/** Сегодня по Москве */
export function mskToday(now = Date.now()): ISODate {
  return mskDay(now);
}

export const toIso = (ms: number): ISODateTime => new Date(ms).toISOString();
