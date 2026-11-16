/** Проверка формы прибыли демо-данных: доля убыточных дней, разброс, рост по месяцам — `node scripts/profit.ts` */
import { generateDataset } from "../src/data/mock/generate.ts";
import { buildIndex, dailyTotals, Scope } from "../src/data/mock/engine.ts";
import { mskMonth } from "../src/lib/dates.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const idx = buildIndex(ds);
const f = { preset: "custom", from: ds.generatedFor.startDate, to: ds.generatedFor.endDate, compare: "none", attribution: "last_click", sourceIds: [], campaignIds: [], adIds: [], productIds: [], managerIds: [], funnelStep: null } as const;
const days = [...dailyTotals(new Scope(idx, { ...f, sourceIds: [], campaignIds: [], adIds: [], productIds: [], managerIds: [] }), { from: f.from, to: f.to }).entries()];
const profit = days.map(([d, t]) => ({ d, p: t.revenue - t.spend, r: t.revenue, s: t.spend }));
const neg = profit.filter((x) => x.p < 0).length;
const mean = profit.reduce((s, x) => s + x.p, 0) / profit.length;
const sd = Math.sqrt(profit.reduce((s, x) => s + (x.p - mean) ** 2, 0) / profit.length);
const byMonth = new Map<string, number>();
for (const x of profit) byMonth.set(mskMonth(x.d), (byMonth.get(mskMonth(x.d)) ?? 0) + x.p);
const paid = ds.orders.filter((o) => ["paid", "installment", "refunded"].includes(o.status)).length;
const refunded = ds.orders.filter((o) => o.status === "refunded").length;
console.log({ days: profit.length, negativeDays: neg, meanProfit: Math.round(mean), sd: Math.round(sd), cv: +(sd / mean).toFixed(2), paid, refundShare: +(refunded / paid).toFixed(3), revenue: Math.round(profit.reduce((s, x) => s + x.r, 0)), spend: Math.round(profit.reduce((s, x) => s + x.s, 0)), leads: ds.leads.length, touches: ds.touchpoints.length });
console.log(Object.fromEntries([...byMonth].map(([m, v]) => [m, Math.round(v)])));
console.log("убыточные дни:", profit.filter((x) => x.p < 0).map((x) => `${x.d}: выручка ${Math.round(x.r)}, расход ${x.s}`).join("\n"));
