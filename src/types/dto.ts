/**
 * Формы ответов DataSource — то, что получает UI. Одинаковы для моков и будущего REST API.
 * Новые DTO добавляются вместе со страницами (шаг 4).
 */
import type { FunnelStep, ID, ISODate, ISODateTime, LeadStatus, PlanMetric, ProductCategory, SourceId } from "./domain.ts";
import type { TrafficMetrics } from "../lib/kpi.ts";

export interface DataMeta {
  /** Откуда данные: генератор в браузере или REST API */
  kind: "mock" | "api";
  /** Первый и последний день, за которые есть данные */
  startDate: ISODate;
  endDate: ISODate;
  timezone: "Europe/Moscow";
  currency: "RUB";
}

export interface Option<T extends string = ID> {
  id: T;
  name: string;
}

export interface FilterOptions {
  sources: (Option<SourceId> & { isPaid: boolean })[];
  campaigns: (Option & { sourceId: SourceId })[];
  ads: (Option & { campaignId: ID })[];
  products: (Option & { category: ProductCategory })[];
  managers: Option[];
}

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

// ── Сводка ─────────────────────────────────────────────────
export interface KpiValue {
  value: number | null;
  /** Значение за прошлый период (если включено сравнение) */
  prev: number | null;
  /** Изменение к прошлому периоду, доля */
  change: number | null;
  /** Точки спарклайна по корзинам периода */
  spark: (number | null)[];
}

export interface KpiSet<K extends string = string> {
  range: DateRange;
  prevRange: DateRange | null;
  /** Размер корзины спарклайна в днях */
  bucketDays: number;
  items: Record<K, KpiValue>;
}

export interface DailyPoint {
  date: ISODate;
  revenue: number;
  spend: number;
}

export interface RevenueSpendSeries {
  current: DailyPoint[];
  /** Прошлый период, выровненный по дням текущего (или null без сравнения) */
  previous: DailyPoint[] | null;
}

export interface FunnelStepRow {
  step: FunnelStep;
  count: number;
  crPrev: number | null;
  crFirst: number | null;
  lost: number;
  /** Медиана времени от предыдущего шага, минуты */
  medianMinutes: number | null;
}

export interface FunnelData {
  range: DateRange;
  steps: FunnelStepRow[];
}

export interface SourceRomiRow {
  sourceId: SourceId;
  name: string;
  spend: number;
  revenue: number;
  sales: number;
  romi: number | null;
}

export interface PlanFactRow {
  metric: PlanMetric;
  plan: number;
  fact: number;
  /** Прогноз на конец месяца при текущем темпе */
  forecast: number | null;
  progress: number | null;
}

export interface PlanFact {
  month: string;
  daysPassed: number;
  daysInMonth: number;
  rows: PlanFactRow[];
  /** История выручки по месяцам: план и факт */
  history: { month: string; plan: number; fact: number }[];
}

// ── Маркетинг ──────────────────────────────────────────────
export type TrafficLevel = "source" | "campaign" | "ad";

/** Строка таблицы трафика: источник → кампании → объявления */
export interface TrafficRow {
  id: ID;
  level: TrafficLevel;
  name: string;
  sourceId: SourceId;
  campaignId: ID | null;
  adId: ID | null;
  isPaid: boolean;
  metrics: TrafficMetrics;
  children?: TrafficRow[];
}

export interface DailyTraffic {
  date: ISODate;
  clicks: number;
  spend: number;
  leads: number;
}

/** Лид в разрезе объявления (drill-down: объявление → лиды → карточка клиента) */
export interface LeadRow {
  leadId: ID;
  userId: ID;
  name: string;
  username: string | null;
  createdAt: ISODateTime;
  status: LeadStatus;
  /** Доля лида, отнесённая к объявлению моделью атрибуции */
  weight: number;
  /** Выручка клиента за всё время */
  ltv: number;
}
