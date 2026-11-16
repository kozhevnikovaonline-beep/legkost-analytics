/**
 * Контракт источника данных. UI знает только этот интерфейс.
 * Реализации: MockDataSource (генератор в браузере) и ApiDataSource (REST API, заглушка).
 * Каждый метод = один виджет/экран = один эндпоинт будущего бэкенда (таблица в README).
 * Методы для страниц добавляются по мере их реализации (шаг 4).
 */
import type { DataMeta, FilterOptions, FunnelData, KpiSet, PlanFact, RevenueSpendSeries, SourceRomiRow } from "../types/dto.ts";
import type { Filters } from "../types/filters.ts";
import type { SummaryKpi } from "../lib/kpi.ts";

export interface DataSource {
  /** Диапазон данных, валюта, таймзона — GET /api/meta */
  getMeta(): Promise<DataMeta>;
  /** Значения для слайсеров — GET /api/filters/options */
  getFilterOptions(): Promise<FilterOptions>;

  // ── Сводка ──
  /** KPI с прошлым периодом и спарклайнами — GET /api/summary/kpis */
  getKpis(f: Filters): Promise<KpiSet<SummaryKpi>>;
  /** Выручка и расход по дням — GET /api/summary/revenue-spend */
  getRevenueSpendSeries(f: Filters): Promise<RevenueSpendSeries>;
  /** Воронка когорты пришедших за период — GET /api/funnel */
  getFunnel(f: Filters): Promise<FunnelData>;
  /** Платные источники с ROMI — GET /api/summary/top-sources */
  getTopSources(f: Filters): Promise<SourceRomiRow[]>;
  /** План / факт за месяц окончания периода — GET /api/summary/plan-fact */
  getPlanFact(f: Filters): Promise<PlanFact>;
}
