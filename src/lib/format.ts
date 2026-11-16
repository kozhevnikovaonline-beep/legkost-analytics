/** Форматирование через Intl: рубли, проценты, числа, даты (ru-RU, Europe/Moscow) */
import type { ISODate } from "../types/domain.ts";

const TZ = "Europe/Moscow";

const rubFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const rubCompactFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", notation: "compact", maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const numCompactFmt = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 });
const pctSignedFmt = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const ratioFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
const dayYearFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

const DASH = "—";

export const rub = (v: number | null, compact = false): string => (v === null ? DASH : (compact ? rubCompactFmt : rubFmt).format(v));
export const num = (v: number | null, compact = false): string => (v === null ? DASH : (compact ? numCompactFmt : numFmt).format(v));
/** Доля → проценты: 0.253 → «25,3 %» */
export const pct = (v: number | null): string => (v === null ? DASH : pctFmt.format(v));
/** Изменение со знаком: 0.12 → «+12 %» */
export const pctSigned = (v: number | null): string => (v === null ? DASH : pctSignedFmt.format(v));
export const ratio = (v: number | null): string => (v === null ? DASH : ratioFmt.format(v));

const asUtcDate = (d: ISODate) => new Date(`${d}T00:00:00Z`);
/** «17 окт.» */
export const day = (d: ISODate): string => dayFmt.format(asUtcDate(d)).replace(".", "");
/** «17 окт. 2026 г.» */
export const dayYear = (d: ISODate): string => dayYearFmt.format(asUtcDate(d));
/** Момент времени по Москве: «17 окт., 21:05» */
export const dateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));

/** Подпись диапазона: «17 окт — 15 ноя» */
export function rangeLabel(from: ISODate, to: ISODate): string {
  if (from === to) return day(from);
  return `${day(from)} — ${day(to)}`;
}
