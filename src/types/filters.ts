import type { FunnelStep, ID, ISODate, SourceId } from "./domain.ts";

export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";
export type Attribution = "first_click" | "last_click" | "linear";
export type CompareMode = "previous_period" | "none";

export interface Filters {
  preset: DatePreset;
  from: ISODate;
  to: ISODate;
  compare: CompareMode;
  attribution: Attribution;
  sourceIds: SourceId[];
  campaignIds: ID[];
  adIds: ID[];
  productIds: ID[];
  managerIds: ID[];
  /** Кросс-фильтр по клику на шаг воронки */
  funnelStep: FunnelStep | null;
}
