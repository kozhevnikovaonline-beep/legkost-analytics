/** Периоды отчёта: пресеты, свой диапазон, прошлый период для сравнения */
import type { ISODate } from "../types/domain.ts";
import type { DatePreset } from "../types/filters.ts";
import { addDays, diffDays } from "./dates.ts";

export interface Range {
  from: ISODate;
  to: ISODate;
}

export const PRESETS: { id: Exclude<DatePreset, "custom">; label: string; short: string }[] = [
  { id: "today", label: "Сегодня", short: "Сегодня" },
  { id: "7d", label: "7 дней", short: "7 дн" },
  { id: "30d", label: "30 дней", short: "30 дн" },
  { id: "90d", label: "90 дней", short: "90 дн" },
];

const LENGTH: Record<Exclude<DatePreset, "custom">, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

/** Диапазон пресета, заканчивающийся сегодня (включительно) */
export function presetRange(preset: Exclude<DatePreset, "custom">, today: ISODate): Range {
  return { from: addDays(today, -(LENGTH[preset] - 1)), to: today };
}

/** Прошлый период той же длины, сразу перед текущим */
export function previousRange(r: Range): Range {
  const len = diffDays(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

/** Ограничить диапазон датами, за которые есть данные */
export function clampRange(r: Range, min: ISODate, max: ISODate): Range {
  const from = r.from < min ? min : r.from > max ? max : r.from;
  const to = r.to > max ? max : r.to < from ? from : r.to;
  return { from, to };
}

export const rangeDays = (r: Range): number => diffDays(r.from, r.to) + 1;
