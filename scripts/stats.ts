/** Быстрая сводка по сгенерированным данным: `npm run stats` */
import { generateDataset } from "../src/data/mock/generate.ts";

const t0 = performance.now();
const ds = generateDataset({ endDate: "2026-11-16" });
const ms = Math.round(performance.now() - t0);

const count = (type: string) => new Set(ds.events.filter((e) => e.type === type).map((e) => e.userId)).size;
const lessons = (n: number) => new Set(ds.events.filter((e) => e.type === "lesson_completed" && e.payload.lesson === n).map((e) => e.userId)).size;
const firstPaid = ds.orders.filter((o) => !o.isRepeat && o.status !== "created" && o.status !== "cancelled");
const revenue = ds.payments.reduce((s, p) => s + p.amount, 0);
const gross = ds.payments.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);
const spend = ds.adCosts.reduce((s, c) => s + c.spend, 0);

console.log({ ms, visitors: new Set(ds.touchpoints.map((t) => t.visitorId)).size, touchpoints: ds.touchpoints.length, users: ds.users.length,
  webapp: count("webapp_open"), leads: ds.leads.length, l1: lessons(1), l2: lessons(2), l3: lessons(3), orders: ds.orders.length,
  paidOrders: ds.orders.filter((o) => ["paid", "installment", "refunded"].includes(o.status)).length, firstPaid: firstPaid.length,
  refunded: ds.orders.filter((o) => o.status === "refunded").length, payments: ds.payments.length, deliveries: ds.nurtureDeliveries.length,
  gross, revenue, spend, romi: Math.round(((revenue - spend) / spend) * 100) });

// По источникам (последнее касание до старта бота)
const lastTouch = new Map<string, string>();
for (const tp of ds.touchpoints) if (tp.userId) lastTouch.set(tp.userId, tp.sourceId);
const bySource: Record<string, { clicks: number; spend: number; revenue: number; leads: number; buyers: number }> = {};
for (const s of ds.sources) bySource[s.id] = { clicks: 0, spend: 0, revenue: 0, leads: 0, buyers: 0 };
for (const tp of ds.touchpoints) bySource[tp.sourceId]!.clicks++;
const adSrc = new Map(ds.ads.map((a) => [a.id, ds.campaigns.find((c) => c.id === a.campaignId)!.sourceId]));
for (const c of ds.adCosts) bySource[adSrc.get(c.adId)!]!.spend += c.spend;
for (const p of ds.payments) bySource[lastTouch.get(p.userId)!]!.revenue += p.amount;
for (const l of ds.leads) bySource[lastTouch.get(l.userId)!]!.leads++;
for (const u of new Set(ds.payments.map((p) => p.userId))) bySource[lastTouch.get(u)!]!.buyers++;
console.table(Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, { ...v, romi: v.spend ? Math.round(((v.revenue - v.spend) / v.spend) * 100) : null }])));

const byProduct: Record<string, number> = {};
for (const o of firstPaid) byProduct[o.productId] = (byProduct[o.productId] ?? 0) + 1;
console.log(byProduct);
console.log(ds.plans.slice(-6));
