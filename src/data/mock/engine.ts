/**
 * Движок расчётов на сгенерированных данных — то, что в реальной системе делал бы SQL на бэкенде.
 *
 * Как работают фильтры:
 * - источник / кампания / объявление — через модель атрибуции: каждый пользователь «принадлежит»
 *   своим касаниям с весами (первый клик / последний клик / линейная). Лиды, продажи и выручка
 *   умножаются на долю пользователя, попавшую в фильтр. Расход фильтруется напрямую по объявлениям;
 * - продукт — по заказам и оплатам; менеджер — по заказам, оплатам и лидам;
 * - шаг воронки (кросс-фильтр) — только пользователи, дошедшие до этого шага.
 */
import type { AppEvent, Dataset, FunnelStep, ID, ISODate, Lead, Order, Payment, SourceId, Touchpoint } from "../../types/domain.ts";
import { FUNNEL_STEPS } from "../../types/domain.ts";
import type { Attribution, Filters } from "../../types/filters.ts";
import { attribute } from "../../lib/attribution.ts";
import { addDays, DAY_MS, diffDays, mskDay, mskDayStart, mskMonth } from "../../lib/dates.ts";
import type { Range } from "../../lib/period.ts";

interface UserTouchShare {
  sourceId: SourceId;
  campaignId: ID | null;
  adId: ID | null;
  weight: number;
}

/** Время первого достижения шагов воронки пользователем, мс */
type StepTimes = Partial<Record<FunnelStep, number>>;

export interface Index {
  ds: Dataset;
  adCampaign: Map<ID, ID>;
  campaignSource: Map<ID, SourceId>;
  touchesByUser: Map<ID, Touchpoint[]>;
  touchesByVisitor: Map<ID, Touchpoint[]>;
  visitorUser: Map<ID, ID | null>;
  steps: Map<ID, StepTimes>;
  ordersByUser: Map<ID, Order[]>;
  orderById: Map<ID, Order>;
  paymentsByOrder: Map<ID, Payment[]>;
  /** Первая успешная оплата клиента (момент «стал клиентом»), мс */
  firstPaidAt: Map<ID, number>;
  /** Выручка клиента за всё время (net) */
  lifetime: Map<ID, number>;
  shares: Map<Attribution, Map<ID, UserTouchShare[]>>;
}

const t = (iso: string) => Date.parse(iso);
const isFirstPayment = (p: Payment) => p.kind === "full" || (p.kind === "installment" && p.installmentNo === 1);
const PAID: Order["status"][] = ["paid", "installment", "refunded"];

export function buildIndex(ds: Dataset): Index {
  const adCampaign = new Map(ds.ads.map((a) => [a.id, a.campaignId]));
  const campaignSource = new Map(ds.campaigns.map((c) => [c.id, c.sourceId]));
  const touchesByUser = new Map<ID, Touchpoint[]>();
  const touchesByVisitor = new Map<ID, Touchpoint[]>();
  const visitorUser = new Map<ID, ID | null>();
  for (const tp of ds.touchpoints) {
    touchesByVisitor.set(tp.visitorId, [...(touchesByVisitor.get(tp.visitorId) ?? []), tp]);
    if (tp.userId) touchesByUser.set(tp.userId, [...(touchesByUser.get(tp.userId) ?? []), tp]);
    if (!visitorUser.get(tp.visitorId)) visitorUser.set(tp.visitorId, tp.userId);
  }

  const steps = new Map<ID, StepTimes>();
  const mark = (userId: ID, step: FunnelStep, at: number) => {
    const s = steps.get(userId) ?? {};
    if (s[step] === undefined || at < s[step]) s[step] = at;
    steps.set(userId, s);
  };
  for (const u of ds.users) {
    const first = touchesByUser.get(u.id)?.[0];
    if (first) mark(u.id, "click", t(first.at));
  }
  const eventStep = (e: AppEvent): FunnelStep | null => {
    switch (e.type) {
      case "bot_start":
        return "bot_start";
      case "webapp_open":
        return "webapp_open";
      case "onboarded":
        return "lead";
      case "lesson_completed":
        return `lesson_${e.payload.lesson}`;
      default:
        return null;
    }
  };
  for (const e of ds.events) {
    const step = eventStep(e);
    if (step) mark(e.userId, step, t(e.at));
  }

  const ordersByUser = new Map<ID, Order[]>();
  const orderById = new Map<ID, Order>();
  for (const o of ds.orders) {
    ordersByUser.set(o.userId, [...(ordersByUser.get(o.userId) ?? []), o]);
    orderById.set(o.id, o);
    if (!o.isRepeat) mark(o.userId, "order", t(o.createdAt));
  }
  const paymentsByOrder = new Map<ID, Payment[]>();
  const firstPaidAt = new Map<ID, number>();
  const lifetime = new Map<ID, number>();
  const paidCount = new Map<ID, number>();
  for (const p of ds.payments) {
    paymentsByOrder.set(p.orderId, [...(paymentsByOrder.get(p.orderId) ?? []), p]);
    lifetime.set(p.userId, (lifetime.get(p.userId) ?? 0) + p.amount);
    if (p.amount > 0) {
      const at = t(p.at);
      if (!firstPaidAt.has(p.userId)) {
        firstPaidAt.set(p.userId, at);
        mark(p.userId, "payment", at);
      }
      // Повторная оплата: второй оплаченный заказ или продление подписки
      if (isFirstPayment(p) || p.kind === "subscription") {
        const n = (paidCount.get(p.userId) ?? 0) + 1;
        paidCount.set(p.userId, n);
        if (n === 2) mark(p.userId, "repeat_payment", at);
      }
    }
  }

  return { ds, adCampaign, campaignSource, touchesByUser, touchesByVisitor, visitorUser, steps, ordersByUser, orderById, paymentsByOrder, firstPaidAt, lifetime, shares: new Map() };
}

/** Доли пользователя по касаниям в выбранной модели атрибуции (кэшируется) */
function sharesFor(idx: Index, model: Attribution): Map<ID, UserTouchShare[]> {
  let m = idx.shares.get(model);
  if (!m) {
    m = new Map();
    for (const [userId, touches] of idx.touchesByUser) {
      m.set(
        userId,
        attribute(touches, model).map(({ touch, weight }) => ({ sourceId: touch.sourceId, campaignId: touch.campaignId, adId: touch.adId, weight })),
      );
    }
    idx.shares.set(model, m);
  }
  return m;
}

/** Применение фильтров к сущностям */
export class Scope {
  readonly idx: Index;
  readonly f: Filters;
  private shares: Map<ID, UserTouchShare[]>;
  private touchFiltered: boolean;
  private weightCache = new Map<ID, number>();

  constructor(idx: Index, f: Filters) {
    this.idx = idx;
    this.f = f;
    this.shares = sharesFor(idx, f.attribution);
    this.touchFiltered = f.sourceIds.length + f.campaignIds.length + f.adIds.length > 0;
  }

  /** Подходит ли касание / доля под фильтр источника, кампании, объявления */
  matchTouch(x: { sourceId: SourceId; campaignId: ID | null; adId: ID | null }): boolean {
    const { sourceIds, campaignIds, adIds } = this.f;
    return (
      (!sourceIds.length || sourceIds.includes(x.sourceId)) &&
      (!campaignIds.length || (x.campaignId !== null && campaignIds.includes(x.campaignId))) &&
      (!adIds.length || (x.adId !== null && adIds.includes(x.adId)))
    );
  }

  /** Доля пользователя (0…1), попадающая в фильтры, с учётом атрибуции и кросс-фильтра шага */
  userWeight(userId: ID): number {
    const cached = this.weightCache.get(userId);
    if (cached !== undefined) return cached;
    let w = 1;
    if (this.f.funnelStep && this.idx.steps.get(userId)?.[this.f.funnelStep] === undefined) w = 0;
    else if (this.touchFiltered) w = (this.shares.get(userId) ?? []).reduce((s, x) => s + (this.matchTouch(x) ? x.weight : 0), 0);
    this.weightCache.set(userId, w);
    return w;
  }

  /** Доли пользователя по источникам (для разбивки выручки по источникам) */
  userShares(userId: ID): UserTouchShare[] {
    return this.shares.get(userId) ?? [];
  }

  orderOk(o: Order): boolean {
    const { productIds, managerIds } = this.f;
    return (!productIds.length || productIds.includes(o.productId)) && (!managerIds.length || (o.managerId !== null && managerIds.includes(o.managerId)));
  }

  leadOk(l: Lead): boolean {
    return !this.f.managerIds.length || (l.managerId !== null && this.f.managerIds.includes(l.managerId));
  }

  adOk(adId: ID, ignoreTouchFilters = false): boolean {
    if (ignoreTouchFilters) return true;
    const campaignId = this.idx.adCampaign.get(adId) ?? null;
    return this.matchTouch({ sourceId: this.idx.campaignSource.get(campaignId ?? "")!, campaignId, adId });
  }
}

const inRange = (day: ISODate, r: Range) => day >= r.from && day <= r.to;

// ── Итоги за период ────────────────────────────────────────
export interface Totals {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  gross: number;
  refunds: number;
  sales: number;
  newCustomers: number;
  /** Сумма LTV новых клиентов (для среднего LTV) */
  newCustomersLtv: number;
  payers: number;
  botUsers: number;
}

export const emptyTotals = (): Totals => ({ spend: 0, impressions: 0, clicks: 0, leads: 0, revenue: 0, gross: 0, refunds: 0, sales: 0, newCustomers: 0, newCustomersLtv: 0, payers: 0, botUsers: 0 });

/** Итоги по дням: ключ — день (МСК). Один проход по таблицам на весь период */
export function dailyTotals(scope: Scope, r: Range): Map<ISODate, Totals> {
  const { idx } = scope;
  const days = new Map<ISODate, Totals>();
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) days.set(d, emptyTotals());
  const at = (day: ISODate) => days.get(day);

  for (const c of idx.ds.adCosts) {
    const row = at(c.date);
    if (!row || !scope.adOk(c.adId)) continue;
    row.spend += c.spend;
    row.impressions += c.impressions;
    row.clicks += c.clicks;
  }
  for (const l of idx.ds.leads) {
    const row = at(mskDay(l.createdAt));
    if (row && scope.leadOk(l)) row.leads += scope.userWeight(l.userId);
  }
  for (const u of idx.ds.users) {
    const row = at(mskDay(u.createdAt));
    if (row) row.botUsers += scope.userWeight(u.id);
  }
  const payersByDay = new Map<ISODate, Set<ID>>();
  for (const p of idx.ds.payments) {
    const day = mskDay(p.at);
    const row = at(day);
    if (!row) continue;
    const order = idx.orderById.get(p.orderId)!;
    if (!scope.orderOk(order)) continue;
    const w = scope.userWeight(p.userId);
    if (!w) continue;
    row.revenue += p.amount * w;
    if (p.amount > 0) {
      row.gross += p.amount * w;
      const set = payersByDay.get(day) ?? new Set();
      if (!set.has(p.userId)) {
        set.add(p.userId);
        row.payers += w;
      }
      payersByDay.set(day, set);
    } else row.refunds += -p.amount * w;
    if (isFirstPayment(p) && order.status !== "refunded") row.sales += w;
  }
  for (const [userId, firstAt] of idx.firstPaidAt) {
    const row = at(mskDay(firstAt));
    if (!row) continue;
    // Клиент засчитывается, если его первый заказ подходит под фильтр продукта/менеджера
    const first = idx.ordersByUser.get(userId)?.find((o) => PAID.includes(o.status));
    if (!first || !scope.orderOk(first)) continue;
    const w = scope.userWeight(userId);
    row.newCustomers += w;
    row.newCustomersLtv += (idx.lifetime.get(userId) ?? 0) * w;
  }
  return days;
}

export function sumTotals(rows: Iterable<Totals>): Totals {
  const s = emptyTotals();
  for (const r of rows) for (const k of Object.keys(s) as (keyof Totals)[]) s[k] += r[k];
  return s;
}

/** Размер корзины спарклайна: до месяца — день, до квартала — неделя, дальше — 2 недели */
export function bucketDays(r: Range): number {
  const len = diffDays(r.from, r.to) + 1;
  return len <= 31 ? 1 : len <= 92 ? 7 : 14;
}

/** Сгруппировать дневные итоги в корзины */
export function bucketize(days: Map<ISODate, Totals>, size: number): { start: ISODate; totals: Totals }[] {
  const entries = [...days.entries()];
  const out: { start: ISODate; totals: Totals }[] = [];
  for (let i = 0; i < entries.length; i += size) {
    const chunk = entries.slice(i, i + size);
    out.push({ start: chunk[0]![0], totals: sumTotals(chunk.map(([, v]) => v)) });
  }
  return out;
}

// ── Воронка (когорта пришедших за период) ──────────────────
export interface FunnelCounts {
  counts: Record<FunnelStep, number>;
  /** Минуты между шагом и предыдущим по каждому пользователю */
  gaps: Record<FunnelStep, number[]>;
}

/**
 * Когорта: визитёры, у которых есть касание за период (под фильтр источника/кампании/объявления).
 * Дальше считаем, до какого шага они дошли за всё время. Продукт и менеджер фильтруют шаги заказа и оплаты.
 */
export function funnelCohort(scope: Scope, r: Range): FunnelCounts {
  const { idx } = scope;
  const counts = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0])) as Record<FunnelStep, number>;
  const gaps = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, [] as number[]])) as Record<FunnelStep, number[]>;
  const seen = new Set<ID>();
  for (const [visitorId, touches] of idx.touchesByVisitor) {
    const tp = touches.find((x) => inRange(mskDay(x.at), r) && scope.matchTouch(x));
    if (!tp || seen.has(visitorId)) continue;
    seen.add(visitorId);
    const userId = idx.visitorUser.get(visitorId) ?? null;
    if (scope.f.funnelStep && scope.f.funnelStep !== "click" && (!userId || idx.steps.get(userId)?.[scope.f.funnelStep] === undefined)) continue;
    counts.click++;
    if (!userId) continue;
    const st = { ...idx.steps.get(userId) };
    // Продукт / менеджер: заказ и оплата засчитываются, только если первый заказ подходит
    if (scope.f.productIds.length || scope.f.managerIds.length) {
      const first = idx.ordersByUser.get(userId)?.find((o) => !o.isRepeat);
      if (!first || !scope.orderOk(first)) {
        delete st.order;
        delete st.payment;
        delete st.repeat_payment;
      }
    }
    let prevAt = t(tp.at);
    for (const step of FUNNEL_STEPS.slice(1)) {
      const at = st[step];
      if (at === undefined) break;
      counts[step]++;
      gaps[step].push(Math.max(0, (at - prevAt) / 60_000));
      prevAt = at;
    }
  }
  return { counts, gaps };
}

// ── План / факт ────────────────────────────────────────────
export interface MonthFact {
  revenue: number;
  leads: number;
  sales: number;
}

/** Факт по школе за месяц (без фильтров) до момента `untilDay` включительно */
export function monthFact(idx: Index, month: string, untilDay?: ISODate): MonthFact {
  const ok = (iso: string) => mskMonth(iso) === month && (!untilDay || mskDay(iso) <= untilDay);
  let revenue = 0;
  let sales = 0;
  for (const p of idx.ds.payments) {
    if (!ok(p.at)) continue;
    revenue += p.amount;
    if (isFirstPayment(p) && idx.orderById.get(p.orderId)!.status !== "refunded") sales++;
  }
  const leads = idx.ds.leads.filter((l) => ok(l.createdAt)).length;
  return { revenue, leads, sales };
}

export const daysInMonth = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
export const monthStartMs = (month: string) => mskDayStart(`${month}-01`);
export { DAY_MS };

// ── Маркетинг: дерево источник → кампания → объявление ─────
export interface TrafficAgg {
  impressions: number;
  /** Все переходы (включая органику и рефералов) */
  clicks: number;
  /** Клики по платной рекламе — для CTR и CPC */
  paidClicks: number;
  spend: number;
  leads: number;
  sales: number;
  revenue: number;
  newCustomers: number;
}

export const emptyTraffic = (): TrafficAgg => ({ impressions: 0, clicks: 0, paidClicks: 0, spend: 0, leads: 0, sales: 0, revenue: 0, newCustomers: 0 });

/**
 * Метрики по объявлениям за период. Расход, показы и клики — напрямую по объявлению;
 * лиды, продажи, выручка и новые клиенты распределяются по объявлениям моделью атрибуции.
 * Строки, не попадающие под фильтр источника/кампании/объявления, отбрасываются.
 */
export function trafficByAd(scope: Scope, r: Range): Map<ID, TrafficAgg> {
  const { idx } = scope;
  // Веса пользователей без фильтров касаний: разбивка по объявлениям делается здесь же
  const loose = new Scope(idx, { ...scope.f, sourceIds: [], campaignIds: [], adIds: [] });
  const byAd = new Map<ID, TrafficAgg>();
  const row = (adId: ID) => {
    let a = byAd.get(adId);
    if (!a) byAd.set(adId, (a = emptyTraffic()));
    return a;
  };
  const okAd = (adId: ID | null): adId is ID => adId !== null && scope.adOk(adId);
  const paidSources = new Set(idx.ds.sources.filter((s) => s.isPaid).map((s) => s.id));

  for (const c of idx.ds.adCosts) {
    if (c.date < r.from || c.date > r.to || !okAd(c.adId)) continue;
    const a = row(c.adId);
    a.impressions += c.impressions;
    a.spend += c.spend;
  }
  for (const tp of idx.ds.touchpoints) {
    if (!inRange(mskDay(tp.at), r) || !okAd(tp.adId)) continue;
    const a = row(tp.adId);
    a.clicks += 1;
    if (paidSources.has(tp.sourceId)) a.paidClicks += 1;
  }
  const spread = (userId: ID, value: number, key: keyof TrafficAgg) => {
    const w = loose.userWeight(userId);
    if (!w) return;
    for (const sh of loose.userShares(userId)) if (okAd(sh.adId)) row(sh.adId)[key] += value * w * sh.weight;
  };
  for (const l of idx.ds.leads) if (inRange(mskDay(l.createdAt), r) && scope.leadOk(l)) spread(l.userId, 1, "leads");
  for (const p of idx.ds.payments) {
    if (!inRange(mskDay(p.at), r)) continue;
    const order = idx.orderById.get(p.orderId)!;
    if (!scope.orderOk(order)) continue;
    spread(p.userId, p.amount, "revenue");
    if (isFirstPayment(p) && order.status !== "refunded") spread(p.userId, 1, "sales");
  }
  for (const [userId, firstAt] of idx.firstPaidAt) {
    if (!inRange(mskDay(firstAt), r)) continue;
    const first = idx.ordersByUser.get(userId)?.find((o) => PAID.includes(o.status));
    if (first && scope.orderOk(first)) spread(userId, 1, "newCustomers");
  }
  return byAd;
}

export function addTraffic(a: TrafficAgg, b: TrafficAgg): TrafficAgg {
  return {
    impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks,
    paidClicks: a.paidClicks + b.paidClicks,
    spend: a.spend + b.spend,
    leads: a.leads + b.leads,
    sales: a.sales + b.sales,
    revenue: a.revenue + b.revenue,
    newCustomers: a.newCustomers + b.newCustomers,
  };
}

/** Клики, расход и лиды по дням (для графика маркетинга) */
export function dailyTraffic(scope: Scope, r: Range): { date: ISODate; clicks: number; spend: number; leads: number }[] {
  const days = new Map<ISODate, { clicks: number; spend: number; leads: number }>();
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) days.set(d, { clicks: 0, spend: 0, leads: 0 });
  for (const tp of scope.idx.ds.touchpoints) {
    const row = days.get(mskDay(tp.at));
    if (row && scope.matchTouch(tp)) row.clicks += 1;
  }
  for (const c of scope.idx.ds.adCosts) {
    const row = days.get(c.date);
    if (row && scope.adOk(c.adId)) row.spend += c.spend;
  }
  for (const l of scope.idx.ds.leads) {
    const row = days.get(mskDay(l.createdAt));
    if (row && scope.leadOk(l)) row.leads += scope.userWeight(l.userId);
  }
  return [...days.entries()].map(([date, v]) => ({ date, ...v }));
}
