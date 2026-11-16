/** Реализация DataSource на сгенерированных данных: фильтрует «базу» и считает метрики через lib/metrics */
import type { DataSource } from "../DataSource.ts";
import type { ClientCard, ClientQuery, ClientRow, DailyPoint, DailyTraffic, Page, DataMeta, FilterOptions, FunnelBySourceRow, FunnelData, KpiSet, KpiValue, LeadRow, ManagerRow, PlanFact, PlanFactRow, RevenueSpendSeries, SalesBreakdown, SourceRomiRow, StallReport, TrafficRow } from "../../types/dto.ts";
import type { Filters } from "../../types/filters.ts";
import type { ID, PlanMetric, SourceId } from "../../types/domain.ts";
import { FUNNEL_STEPS } from "../../types/domain.ts";
import { MARKETING_KPIS, SALES_KPIS, salesKpis, SUMMARY_KPIS, summaryKpis, trafficMetrics, type MarketingKpi, type SalesKpi, type SummaryKpi } from "../../lib/kpi.ts";
import { avgCheck, change, cr, funnel, median, planProgress, romi, runRate, safeDiv } from "../../lib/metrics.ts";
import { previousRange, type Range } from "../../lib/period.ts";
import { mskDay, mskMonth } from "../../lib/dates.ts";
import { getDataset } from "./db.ts";
import { clientCard, listClients } from "./clients.ts";
import { addDays, diffDays } from "../../lib/dates.ts";
import { addTraffic, bucketDays, bucketize, buildIndex, daysInMonth, dailyTotals, dailyTraffic, emptyTraffic, funnelCohort, monthFact, NEXT_OF, paymentsByKind, salesByManager, salesByProduct, salesTotals, Scope, stalls, sumTotals, trafficByAd, type Index, type TrafficAgg } from "./engine.ts";

/** Небольшая задержка, как у настоящего API, — чтобы были видны скелетоны */
const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

let indexPromise: Promise<Index> | null = null;
const getIndex = () => (indexPromise ??= getDataset().then(buildIndex));

const rangeOf = (f: Filters): Range => ({ from: f.from, to: f.to });

export class MockDataSource implements DataSource {
  private async ready(): Promise<Index> {
    const [idx] = await Promise.all([getIndex(), latency()]);
    return idx;
  }

  async getMeta(): Promise<DataMeta> {
    const ds = await getDataset();
    return { kind: "mock", startDate: ds.generatedFor.startDate, endDate: ds.generatedFor.endDate, timezone: "Europe/Moscow", currency: "RUB" };
  }

  async getFilterOptions(): Promise<FilterOptions> {
    const { ds } = await this.ready();
    return {
      sources: ds.sources.map((s) => ({ id: s.id, name: s.name, isPaid: s.isPaid })),
      campaigns: ds.campaigns.map((c) => ({ id: c.id, name: c.name, sourceId: c.sourceId })),
      ads: ds.ads.map((a) => ({ id: a.id, name: a.name, campaignId: a.campaignId })),
      products: ds.products.filter((p) => p.category !== "lead_magnet").map((p) => ({ id: p.id, name: p.name, category: p.category })),
      managers: ds.managers.map((m) => ({ id: m.id, name: m.name })),
    };
  }

  async getKpis(f: Filters): Promise<KpiSet<SummaryKpi>> {
    const idx = await this.ready();
    const scope = new Scope(idx, f);
    const r = rangeOf(f);
    const prevR = f.compare === "previous_period" ? previousRange(r) : null;
    const days = dailyTotals(scope, r);
    const cur = summaryKpis(sumTotals(days.values()));
    const prev = prevR ? summaryKpis(sumTotals(dailyTotals(scope, prevR).values())) : null;
    const size = bucketDays(r);
    const buckets = bucketize(days, size).map((b) => summaryKpis(b.totals));
    const items = Object.fromEntries(
      SUMMARY_KPIS.map((k): [SummaryKpi, KpiValue] => [
        k,
        { value: cur[k], prev: prev ? prev[k] : null, change: prev ? change(cur[k], prev[k]) : null, spark: buckets.map((b) => b[k]) },
      ]),
    ) as Record<SummaryKpi, KpiValue>;
    return { range: r, prevRange: prevR, bucketDays: size, items };
  }

  async getRevenueSpendSeries(f: Filters): Promise<RevenueSpendSeries> {
    const idx = await this.ready();
    const scope = new Scope(idx, f);
    const toPoints = (r: Range): DailyPoint[] => [...dailyTotals(scope, r).entries()].map(([date, t]) => ({ date, revenue: Math.round(t.revenue), spend: Math.round(t.spend) }));
    const r = rangeOf(f);
    return { current: toPoints(r), previous: f.compare === "previous_period" ? toPoints(previousRange(r)) : null };
  }

  async getFunnel(f: Filters): Promise<FunnelData> {
    const idx = await this.ready();
    const r = rangeOf(f);
    const { counts, gaps } = funnelCohort(new Scope(idx, f), r);
    const stats = funnel(FUNNEL_STEPS.map((s) => counts[s]));
    return { range: r, steps: FUNNEL_STEPS.map((step, i) => ({ step, ...stats[i]!, medianMinutes: i === 0 ? null : median(gaps[step]) })) };
  }

  async getTopSources(f: Filters): Promise<SourceRomiRow[]> {
    const idx = await this.ready();
    const r = rangeOf(f);
    // Виджет сам задаёт фильтр источника, поэтому строится без фильтров источника/кампании/объявления
    const scope = new Scope(idx, { ...f, sourceIds: [], campaignIds: [], adIds: [] });
    const rows = new Map<SourceId, SourceRomiRow>();
    for (const s of idx.ds.sources.filter((x) => x.isPaid)) rows.set(s.id, { sourceId: s.id, name: s.name, spend: 0, revenue: 0, sales: 0, romi: null });
    for (const c of idx.ds.adCosts) {
      if (c.date < r.from || c.date > r.to) continue;
      const row = rows.get(idx.campaignSource.get(idx.adCampaign.get(c.adId)!)!);
      if (row) row.spend += c.spend;
    }
    for (const p of idx.ds.payments) {
      const day = mskDay(p.at);
      if (day < r.from || day > r.to) continue;
      const order = idx.orderById.get(p.orderId)!;
      const w = scope.userWeight(p.userId);
      if (!w || !scope.orderOk(order)) continue;
      const first = p.kind === "full" || (p.kind === "installment" && p.installmentNo === 1);
      for (const sh of scope.userShares(p.userId)) {
        const row = rows.get(sh.sourceId);
        if (!row) continue;
        row.revenue += p.amount * w * sh.weight;
        if (first && order.status !== "refunded") row.sales += w * sh.weight;
      }
    }
    return [...rows.values()]
      .map((x) => ({ ...x, revenue: Math.round(x.revenue), romi: romi(x.revenue, x.spend) }))
      .sort((a, b) => (b.romi ?? -Infinity) - (a.romi ?? -Infinity));
  }

  async getPlanFact(f: Filters): Promise<PlanFact> {
    const idx = await this.ready();
    const end = idx.ds.generatedFor.endDate;
    const month = mskMonth(f.to);
    const total = daysInMonth(month);
    const current = month === mskMonth(end);
    const daysPassed = current ? Number(end.slice(8, 10)) : total;
    const fact = monthFact(idx, month, current ? end : undefined);
    const planOf = (m: string, metric: PlanMetric) => idx.ds.plans.find((p) => p.month === m && p.metric === metric)?.value ?? 0;
    const rows: PlanFactRow[] = (["revenue", "leads", "sales"] as const).map((metric) => {
      const plan = planOf(month, metric);
      return { metric, plan, fact: fact[metric], forecast: current ? runRate(fact[metric], daysPassed, total) : fact[metric], progress: planProgress(fact[metric], plan) };
    });
    const months = [...new Set(idx.ds.plans.map((p) => p.month))];
    const history = months.map((m) => ({ month: m, plan: planOf(m, "revenue"), fact: monthFact(idx, m).revenue }));
    return { month, daysPassed, daysInMonth: total, rows, history };
  }

  // ── Маркетинг ──
  async getMarketingKpis(f: Filters): Promise<KpiSet<MarketingKpi>> {
    const idx = await this.ready();
    const scope = new Scope(idx, f);
    const total = (r: Range) => trafficMetrics([...trafficByAd(scope, r).values()].reduce(addTraffic, emptyTraffic()));
    const r = rangeOf(f);
    const prevR = f.compare === "previous_period" ? previousRange(r) : null;
    const cur = total(r);
    const prev = prevR ? total(prevR) : null;
    const size = bucketDays(r);
    const sparks: ReturnType<typeof total>[] = [];
    for (let i = 0; i <= diffDays(r.from, r.to); i += size) {
      const to = addDays(r.from, i + size - 1);
      sparks.push(total({ from: addDays(r.from, i), to: to > r.to ? r.to : to }));
    }
    const items = Object.fromEntries(
      MARKETING_KPIS.map((k): [MarketingKpi, KpiValue] => [k, { value: cur[k], prev: prev ? prev[k] : null, change: prev ? change(cur[k], prev[k]) : null, spark: sparks.map((s) => s[k]) }]),
    ) as Record<MarketingKpi, KpiValue>;
    return { range: r, prevRange: prevR, bucketDays: size, items };
  }

  async getDailyTraffic(f: Filters): Promise<DailyTraffic[]> {
    const idx = await this.ready();
    return dailyTraffic(new Scope(idx, f), rangeOf(f)).map((d) => ({ ...d, leads: Math.round(d.leads * 10) / 10 }));
  }

  async getTrafficTable(f: Filters): Promise<TrafficRow[]> {
    const idx = await this.ready();
    const byAd = trafficByAd(new Scope(idx, f), rangeOf(f));
    const sourceName = new Map(idx.ds.sources.map((s) => [s.id, s]));
    const tree: TrafficRow[] = [];
    for (const s of idx.ds.sources) {
      let sAgg: TrafficAgg = emptyTraffic();
      const campaigns: TrafficRow[] = [];
      for (const c of idx.ds.campaigns.filter((x) => x.sourceId === s.id)) {
        let cAgg: TrafficAgg = emptyTraffic();
        const ads: TrafficRow[] = [];
        for (const a of idx.ds.ads.filter((x) => x.campaignId === c.id)) {
          const agg = byAd.get(a.id);
          if (!agg) continue;
          cAgg = addTraffic(cAgg, agg);
          ads.push({ id: a.id, level: "ad", name: a.name, sourceId: s.id, campaignId: c.id, adId: a.id, isPaid: s.isPaid, metrics: trafficMetrics(agg) });
        }
        if (!ads.length) continue;
        sAgg = addTraffic(sAgg, cAgg);
        campaigns.push({ id: c.id, level: "campaign", name: c.name, sourceId: s.id, campaignId: c.id, adId: null, isPaid: s.isPaid, metrics: trafficMetrics(cAgg), children: ads });
      }
      if (campaigns.length) tree.push({ id: s.id, level: "source", name: sourceName.get(s.id)!.name, sourceId: s.id, campaignId: null, adId: null, isPaid: s.isPaid, metrics: trafficMetrics(sAgg), children: campaigns });
    }
    return tree;
  }

  async getLeadsByAd(f: Filters, adId: ID): Promise<LeadRow[]> {
    const idx = await this.ready();
    const r = rangeOf(f);
    const scope = new Scope(idx, { ...f, sourceIds: [], campaignIds: [], adIds: [] });
    const users = new Map(idx.ds.users.map((u) => [u.id, u]));
    const rows: LeadRow[] = [];
    for (const l of idx.ds.leads) {
      const day = mskDay(l.createdAt);
      if (day < r.from || day > r.to || !scope.leadOk(l)) continue;
      const w = scope.userWeight(l.userId);
      const share = scope.userShares(l.userId).filter((s) => s.adId === adId).reduce((s, x) => s + x.weight, 0) * w;
      if (!share) continue;
      const u = users.get(l.userId)!;
      rows.push({ leadId: l.id, userId: u.id, name: u.firstName, username: u.username, createdAt: l.createdAt, status: l.status, weight: share, ltv: idx.lifetime.get(u.id) ?? 0 });
    }
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  // ── Воронка ──
  async getStalls(f: Filters): Promise<StallReport> {
    const idx = await this.ready();
    const r = rangeOf(f);
    const msgs = new Map(idx.ds.nurtureMessages.map((m) => [m.id, m]));
    const steps = stalls(new Scope(idx, f), r).map((a) => {
      const messages = [...a.messages.entries()]
        .map(([id, n]) => {
          const m = msgs.get(id)!;
          return { id, title: m.title, order: m.order, delayMinutes: m.delayMinutes, cta: m.cta, sent: n.sent, clicked: n.clicked, converted: n.converted, blocked: n.blocked, ctr: safeDiv(n.clicked, n.sent), cr: safeDiv(n.converted, n.sent) };
        })
        .sort((x, y) => x.order - y.order);
      const tot = (k: "sent" | "clicked" | "converted" | "blocked") => messages.reduce((s, m) => s + m[k], 0);
      const sent = tot("sent");
      return { step: a.step, next: NEXT_OF[a.step], reached: a.reached, stuck: a.stuck, nurtured: a.nurtured, returned: a.returned, sent, clicked: tot("clicked"), converted: tot("converted"), blocked: tot("blocked"), ctr: safeDiv(tot("clicked"), sent), cr: safeDiv(tot("converted"), sent), messages };
    });
    return { range: r, steps };
  }

  async getFunnelBySource(f: Filters): Promise<FunnelBySourceRow[]> {
    const idx = await this.ready();
    const r = rangeOf(f);
    const sources = idx.ds.sources.filter((s) => !f.sourceIds.length || f.sourceIds.includes(s.id));
    return sources.map((s) => {
      const { counts } = funnelCohort(new Scope(idx, { ...f, sourceIds: [s.id] }), r);
      return { sourceId: s.id, name: s.name, steps: FUNNEL_STEPS.map((step) => ({ step, count: counts[step], crFirst: step === "click" ? null : cr(counts[step], counts.click) })) };
    });
  }

  // ── Продажи ──
  /** Корзины периода для спарклайнов и динамики */
  private buckets(r: Range): Range[] {
    const size = bucketDays(r);
    const out: Range[] = [];
    for (let i = 0; i <= diffDays(r.from, r.to); i += size) {
      const to = addDays(r.from, i + size - 1);
      out.push({ from: addDays(r.from, i), to: to > r.to ? r.to : to });
    }
    return out;
  }

  async getSalesKpis(f: Filters): Promise<KpiSet<SalesKpi>> {
    const idx = await this.ready();
    const scope = new Scope(idx, f);
    const r = rangeOf(f);
    const prevR = f.compare === "previous_period" ? previousRange(r) : null;
    const cur = salesKpis(salesTotals(scope, r));
    const prev = prevR ? salesKpis(salesTotals(scope, prevR)) : null;
    const sparks = this.buckets(r).map((b) => salesKpis(salesTotals(scope, b)));
    const items = Object.fromEntries(
      SALES_KPIS.map((k): [SalesKpi, KpiValue] => [k, { value: cur[k], prev: prev ? prev[k] : null, change: prev ? change(cur[k], prev[k]) : null, spark: sparks.map((s) => s[k]) }]),
    ) as Record<SalesKpi, KpiValue>;
    return { range: r, prevRange: prevR, bucketDays: bucketDays(r), items };
  }

  async getSalesBreakdown(f: Filters): Promise<SalesBreakdown> {
    const idx = await this.ready();
    const scope = new Scope(idx, f);
    const r = rangeOf(f);
    const products = new Map(idx.ds.products.map((x) => [x.id, x]));
    const rows = [...salesByProduct(scope, r).values()];
    const total = rows.reduce((s, x) => s + x.revenue, 0);
    const byProduct = rows
      .map((x) => ({ ...x, name: products.get(x.productId)!.name, category: products.get(x.productId)!.category, revenue: Math.round(x.revenue), gross: Math.round(x.gross), refunds: Math.round(x.refunds), share: safeDiv(x.revenue, total) }))
      .sort((a, b) => b.revenue - a.revenue);
    const kinds = paymentsByKind(scope, r);
    const byKind = (Object.keys(kinds) as (keyof typeof kinds)[]).map((kind) => ({ kind, amount: Math.round(kinds[kind].amount), count: kinds[kind].count }));
    const timeline = this.buckets(r).map((b) => {
      const s = salesTotals(scope, b);
      return { start: b.from, gross: Math.round(s.gross), refunds: Math.round(s.refunds), net: Math.round(s.net) };
    });
    return { byProduct, byKind, timeline, bucketDays: bucketDays(r) };
  }

  async getManagers(f: Filters): Promise<ManagerRow[]> {
    const idx = await this.ready();
    const r = rangeOf(f);
    const days = diffDays(r.from, r.to) + 1;
    const stats = salesByManager(new Scope(idx, f), r);
    return idx.ds.managers
      .filter((m) => !f.managerIds.length || f.managerIds.includes(m.id))
      .map((m) => {
        const s = stats.get(m.id)!;
        const plan = Math.round((m.monthlyPlanRub * days) / 30);
        return {
          managerId: m.id,
          name: m.name,
          role: m.role,
          orders: s.orders,
          sales: s.sales,
          revenue: Math.round(s.revenue),
          refunds: Math.round(s.refunds),
          avgCheck: avgCheck(s.revenue, s.sales),
          conversion: safeDiv(s.paidOrders, s.orders),
          plan,
          planProgress: planProgress(s.revenue, plan),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ── Клиенты ──
  async getClients(f: Filters, q: ClientQuery): Promise<Page<ClientRow>> {
    const idx = await this.ready();
    return listClients(idx, f, q);
  }

  async getClientById(id: ID, f: Filters): Promise<ClientCard | null> {
    const idx = await this.ready();
    return clientCard(idx, f, id);
  }
}
