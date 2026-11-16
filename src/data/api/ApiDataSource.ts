/**
 * Реализация DataSource поверх REST API — заглушка для будущего бэкенда.
 * Ответы проверяются zod-схемами: если бэкенд вернул не то, UI покажет ошибку, а не сломается.
 *
 * TODO(backend): поднять API по таблице эндпоинтов из README и включить VITE_DATA_SOURCE=api.
 */
import { z } from "zod";
import type { DataSource } from "../DataSource.ts";
import type { DailyTraffic, DataMeta, FilterOptions, FunnelBySourceRow, FunnelData, KpiSet, LeadRow, PlanFact, RevenueSpendSeries, SourceRomiRow, StallReport, TrafficRow } from "../../types/dto.ts";
import type { ID } from "../../types/domain.ts";
import type { Filters } from "../../types/filters.ts";
import { FUNNEL_STEPS } from "../../types/domain.ts";
import { MARKETING_KPIS, SUMMARY_KPIS, type MarketingKpi, type SummaryKpi } from "../../lib/kpi.ts";
import { filtersToQuery } from "../../lib/urlFilters.ts";

const sourceId = z.enum(["yandex_direct", "vk_ads", "tg_ads", "tg_seeding", "organic", "referral"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const metaSchema = z.object({
  kind: z.literal("api"),
  startDate: isoDate,
  endDate: isoDate,
  timezone: z.literal("Europe/Moscow"),
  currency: z.literal("RUB"),
});

const optionsSchema = z.object({
  sources: z.array(z.object({ id: sourceId, name: z.string(), isPaid: z.boolean() })),
  campaigns: z.array(z.object({ id: z.string(), name: z.string(), sourceId })),
  ads: z.array(z.object({ id: z.string(), name: z.string(), campaignId: z.string() })),
  products: z.array(z.object({ id: z.string(), name: z.string(), category: z.enum(["lead_magnet", "tripwire", "subscription", "course", "mentorship"]) })),
  managers: z.array(z.object({ id: z.string(), name: z.string() })),
});

const num = z.number().nullable();
const range = z.object({ from: isoDate, to: isoDate });
const kpiValue = z.object({ value: num, prev: num, change: num, spark: z.array(num) });
const kpiSetSchema = z.object({
  range,
  prevRange: range.nullable(),
  bucketDays: z.number(),
  items: z.object(Object.fromEntries(SUMMARY_KPIS.map((k) => [k, kpiValue])) as Record<SummaryKpi, typeof kpiValue>),
});
const point = z.object({ date: isoDate, revenue: z.number(), spend: z.number() });
const seriesSchema = z.object({ current: z.array(point), previous: z.array(point).nullable() });
const funnelSchema = z.object({
  range,
  steps: z.array(z.object({ step: z.enum(FUNNEL_STEPS as [string, ...string[]]).transform((s) => s as (typeof FUNNEL_STEPS)[number]), count: z.number(), crPrev: num, crFirst: num, lost: z.number(), medianMinutes: num })),
});
const topSourcesSchema = z.array(z.object({ sourceId, name: z.string(), spend: z.number(), revenue: z.number(), sales: z.number(), romi: num }));
const planFactSchema = z.object({
  month: z.string(),
  daysPassed: z.number(),
  daysInMonth: z.number(),
  rows: z.array(z.object({ metric: z.enum(["revenue", "leads", "sales"]), plan: z.number(), fact: z.number(), forecast: num, progress: num })),
  history: z.array(z.object({ month: z.string(), plan: z.number(), fact: z.number() })),
});

const marketingKpiSchema = z.object({
  range,
  prevRange: range.nullable(),
  bucketDays: z.number(),
  items: z.object(Object.fromEntries(MARKETING_KPIS.map((k) => [k, kpiValue])) as Record<MarketingKpi, typeof kpiValue>),
});
const dailyTrafficSchema = z.array(z.object({ date: isoDate, clicks: z.number(), spend: z.number(), leads: z.number() }));
const trafficMetricsSchema = z.object({
  impressions: z.number(), clicks: z.number(), ctr: num, spend: z.number(), cpm: num, cpc: num, leads: z.number(),
  cpl: num, crClickLead: num, sales: z.number(), revenue: z.number(), romi: num, cac: num,
});
const trafficRowSchema: z.ZodType<TrafficRow> = z.lazy(() =>
  z.object({
    id: z.string(),
    level: z.enum(["source", "campaign", "ad"]),
    name: z.string(),
    sourceId,
    campaignId: z.string().nullable(),
    adId: z.string().nullable(),
    isPaid: z.boolean(),
    metrics: trafficMetricsSchema,
    children: z.array(trafficRowSchema).optional(),
  }),
);
const leadRowsSchema = z.array(
  z.object({
    leadId: z.string(), userId: z.string(), name: z.string(), username: z.string().nullable(), createdAt: z.string(),
    status: z.enum(["new", "warming", "offer_sent", "won", "lost"]), weight: z.number(), ltv: z.number(),
  }),
);

const funnelStepEnum = z.enum(FUNNEL_STEPS as [string, ...string[]]).transform((s) => s as (typeof FUNNEL_STEPS)[number]);
const stallStepEnum = z.enum(["bot_start", "webapp_open", "lead", "lesson_1", "lesson_2", "lesson_3", "order"]);
const nurtureRow = z.object({
  id: z.string(), title: z.string(), order: z.number(), delayMinutes: z.number(), cta: z.enum(["open_app", "lesson", "offer", "pay", "reviews"]),
  sent: z.number(), clicked: z.number(), converted: z.number(), blocked: z.number(), ctr: num, cr: num,
});
const stallsSchema = z.object({
  range,
  steps: z.array(z.object({
    step: stallStepEnum, next: funnelStepEnum, reached: z.number(), stuck: z.number(), nurtured: z.number(), returned: z.number(),
    sent: z.number(), clicked: z.number(), converted: z.number(), blocked: z.number(), ctr: num, cr: num, messages: z.array(nurtureRow),
  })),
});
const bySourceSchema = z.array(z.object({ sourceId, name: z.string(), steps: z.array(z.object({ step: funnelStepEnum, count: z.number(), crFirst: num })) }));

export class ApiDataSource implements DataSource {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async get<T>(path: string, schema: z.ZodType<T>, params?: URLSearchParams): Promise<T> {
    const url = `${this.baseUrl}${path}${params?.size ? `?${params}` : ""}`;
    // TODO(backend): авторизация (Bearer-токен админа) и обработка 401
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
    return schema.parse(await res.json());
  }

  getMeta(): Promise<DataMeta> {
    return this.get("/api/meta", metaSchema);
  }

  getFilterOptions(): Promise<FilterOptions> {
    return this.get("/api/filters/options", optionsSchema);
  }

  /** Фильтры передаются в той же форме, что и в адресе админки */
  private q(f: Filters) {
    const p = new URLSearchParams(filtersToQuery(f));
    // Бэкенду всегда передаём точные даты: «30 дней» у клиента и сервера должны совпадать
    p.set("from", f.from);
    p.set("to", f.to);
    return p;
  }

  getKpis(f: Filters): Promise<KpiSet<SummaryKpi>> {
    return this.get("/api/summary/kpis", kpiSetSchema, this.q(f));
  }

  getRevenueSpendSeries(f: Filters): Promise<RevenueSpendSeries> {
    return this.get("/api/summary/revenue-spend", seriesSchema, this.q(f));
  }

  getFunnel(f: Filters): Promise<FunnelData> {
    return this.get("/api/funnel", funnelSchema, this.q(f));
  }

  getTopSources(f: Filters): Promise<SourceRomiRow[]> {
    return this.get("/api/summary/top-sources", topSourcesSchema, this.q(f));
  }

  getPlanFact(f: Filters): Promise<PlanFact> {
    return this.get("/api/summary/plan-fact", planFactSchema, this.q(f));
  }

  getMarketingKpis(f: Filters): Promise<KpiSet<MarketingKpi>> {
    return this.get("/api/marketing/kpis", marketingKpiSchema, this.q(f));
  }

  getDailyTraffic(f: Filters): Promise<DailyTraffic[]> {
    return this.get("/api/marketing/daily", dailyTrafficSchema, this.q(f));
  }

  getTrafficTable(f: Filters): Promise<TrafficRow[]> {
    return this.get("/api/marketing/traffic", z.array(trafficRowSchema), this.q(f));
  }

  getLeadsByAd(f: Filters, adId: ID): Promise<LeadRow[]> {
    return this.get(`/api/marketing/ads/${encodeURIComponent(adId)}/leads`, leadRowsSchema, this.q(f));
  }

  getStalls(f: Filters): Promise<StallReport> {
    return this.get("/api/funnel/stalls", stallsSchema, this.q(f));
  }

  getFunnelBySource(f: Filters): Promise<FunnelBySourceRow[]> {
    return this.get("/api/funnel/by-source", bySourceSchema, this.q(f));
  }
}
