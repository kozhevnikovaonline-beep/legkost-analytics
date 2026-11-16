/**
 * Контракт источника данных. UI знает только этот интерфейс.
 * Реализации: MockDataSource (генератор в браузере) и ApiDataSource (REST API, заглушка).
 * Каждый метод = один виджет/экран = один эндпоинт будущего бэкенда (таблица в README).
 * Методы для страниц добавляются по мере их реализации (шаг 4).
 */
import type { ClientCard, ClientQuery, ClientRow, DailyTraffic, DataMeta, Page, FilterOptions, FunnelBySourceRow, FunnelData, KpiSet, LeadRow, ManagerRow, PlanFact, RevenueSpendSeries, SalesBreakdown, SourceRomiRow, StallReport, TrafficRow } from "../types/dto.ts";
import type { ID } from "../types/domain.ts";
import type { Filters } from "../types/filters.ts";
import type { MarketingKpi, SalesKpi, SummaryKpi } from "../lib/kpi.ts";

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

  // ── Маркетинг ──
  /** Показы, клики, CTR, CPM, CPC, CPL, CR клик→лид — GET /api/marketing/kpis */
  getMarketingKpis(f: Filters): Promise<KpiSet<MarketingKpi>>;
  /** Клики, расход и лиды по дням — GET /api/marketing/daily */
  getDailyTraffic(f: Filters): Promise<DailyTraffic[]>;
  /** Дерево источник → кампания → объявление с метриками до денег — GET /api/marketing/traffic */
  getTrafficTable(f: Filters): Promise<TrafficRow[]>;
  /** Лиды, отнесённые к объявлению моделью атрибуции — GET /api/marketing/ads/:adId/leads */
  getLeadsByAd(f: Filters, adId: ID): Promise<LeadRow[]>;

  // ── Воронка ── (сами шаги — getFunnel выше)
  /** Где остановились и эффективность дожимных постов — GET /api/funnel/stalls */
  getStalls(f: Filters): Promise<StallReport>;
  /** Воронка в разрезе источников — GET /api/funnel/by-source */
  getFunnelBySource(f: Filters): Promise<FunnelBySourceRow[]>;

  // ── Продажи ──
  /** Gross/net, возвраты, заказы, оплаты, средний чек, ARPU, ARPPU, доля рассрочек — GET /api/sales/kpis */
  getSalesKpis(f: Filters): Promise<KpiSet<SalesKpi>>;
  /** Выручка по продуктам, типы платежей, динамика gross/возвраты/net — GET /api/sales/breakdown */
  getSalesBreakdown(f: Filters): Promise<SalesBreakdown>;
  /** Рейтинг менеджеров — GET /api/sales/managers */
  getManagers(f: Filters): Promise<ManagerRow[]>;

  // ── Клиенты ──
  /** Клиенты с поиском, фильтрами и страницами — GET /api/clients */
  getClients(f: Filters, q: ClientQuery): Promise<Page<ClientRow>>;
  /** Карточка клиента: касания, события, дожимы, покупки, LTV — GET /api/clients/:id */
  getClientById(id: ID, f: Filters): Promise<ClientCard | null>;
}
