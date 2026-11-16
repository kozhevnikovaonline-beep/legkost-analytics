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
const oneDigit = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

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

/** Значение метрики по её формату: крупные суммы — компактно («1,3 млн ₽») */
export function metricValue(v: number | null, format: "rub" | "percent" | "number" | "ratio" | "duration"): string {
  if (v === null || !Number.isFinite(v)) return DASH;
  switch (format) {
    case "rub":
      return rub(v, Math.abs(v) >= 1_000_000);
    case "percent":
      return pct(v);
    case "number":
      return num(Math.round(v), Math.abs(v) >= 100_000);
    case "ratio":
      return ratio(v);
    case "duration":
      return duration(v);
  }
}

/** Минуты → «35 мин», «5 ч», «2,5 дн» */
export function duration(minutes: number | null): string {
  if (minutes === null) return DASH;
  if (minutes < 60) return `${Math.round(minutes)} мин`;
  if (minutes < 48 * 60) return `${oneDigit.format(minutes / 60)} ч`;
  return `${oneDigit.format(minutes / 1440)} дн`;
}
