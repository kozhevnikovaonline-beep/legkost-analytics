import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/mock/generate.ts";
import { buildIndex, dailyTotals, funnelCohort, monthFact, Scope, sumTotals } from "../src/data/mock/engine.ts";
import { summaryKpis } from "../src/lib/kpi.ts";
import { mskDay } from "../src/lib/dates.ts";
import type { Filters } from "../src/types/filters.ts";
import { FUNNEL_STEPS, type SourceId } from "../src/types/domain.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const idx = buildIndex(ds);
const base: Filters = {
  preset: "custom",
  from: "2026-08-01",
  to: "2026-10-31",
  compare: "previous_period",
  attribution: "last_click",
  sourceIds: [],
  campaignIds: [],
  adIds: [],
  productIds: [],
  managerIds: [],
  funnelStep: null,
};
const r = { from: base.from, to: base.to };
const total = (f: Filters) => sumTotals(dailyTotals(new Scope(idx, f), r).values());
const inR = (iso: string) => mskDay(iso) >= r.from && mskDay(iso) <= r.to;

describe("движок расчётов", () => {
  it("без фильтров итоги совпадают с суммами по сырым таблицам", () => {
    const t = total(base);
    expect(t.revenue).toBeCloseTo(ds.payments.filter((p) => inR(p.at)).reduce((s, p) => s + p.amount, 0));
    expect(t.spend).toBe(ds.adCosts.filter((c) => c.date >= r.from && c.date <= r.to).reduce((s, c) => s + c.spend, 0));
    expect(t.leads).toBe(ds.leads.filter((l) => inR(l.createdAt)).length);
  });

  it.each(["first_click", "last_click", "linear"] as const)("модель «%s»: выручка и лиды по источникам в сумме дают итог", (attribution) => {
    const all = total({ ...base, attribution });
    const parts = ds.sources.map((s) => total({ ...base, attribution, sourceIds: [s.id as SourceId] }));
    expect(parts.reduce((s, x) => s + x.revenue, 0)).toBeCloseTo(all.revenue, 4);
    expect(parts.reduce((s, x) => s + x.leads, 0)).toBeCloseTo(all.leads, 4);
    expect(parts.reduce((s, x) => s + x.spend, 0)).toBe(all.spend);
  });

  it("модели атрибуции дают разное распределение по источникам", () => {
    const first = total({ ...base, attribution: "first_click", sourceIds: ["vk_ads"] }).leads;
    const last = total({ ...base, attribution: "last_click", sourceIds: ["vk_ads"] }).leads;
    expect(first).not.toBeCloseTo(last, 0);
  });

  it("фильтр продукта делит выручку без остатка", () => {
    const all = total(base).revenue;
    const parts = ds.products.map((p) => total({ ...base, productIds: [p.id] }).revenue);
    expect(parts.reduce((s, x) => s + x, 0)).toBeCloseTo(all, 4);
  });

  it("кросс-фильтр «дошли до шага» сужает выборку", () => {
    const all = total(base);
    const paid = total({ ...base, funnelStep: "payment" });
    expect(paid.leads).toBeLessThan(all.leads);
    expect(paid.revenue).toBeCloseTo(all.revenue, 4); // выручку приносят только дошедшие до оплаты
  });

  it("воронка когорты монотонна и начинается с визитёров периода", () => {
    const { counts } = funnelCohort(new Scope(idx, base), r);
    const visitors = new Set(ds.touchpoints.filter((t) => inR(t.at)).map((t) => t.visitorId)).size;
    expect(counts.click).toBe(visitors);
    for (let i = 1; i < FUNNEL_STEPS.length; i++) expect(counts[FUNNEL_STEPS[i]!]).toBeLessThanOrEqual(counts[FUNNEL_STEPS[i - 1]!]);
  });

  it("KPI сводки согласованы между собой", () => {
    const k = summaryKpis(total(base));
    expect(k.profit).toBeCloseTo(k.revenue! - k.spend!);
    expect(k.roas! - k.romi!).toBeCloseTo(1);
    expect(k.ltvCac).toBeCloseTo(k.ltv! / k.cac!);
  });

  it("факт месяца для плана совпадает с итогами без фильтров", () => {
    const f = monthFact(idx, "2026-09");
    const t = sumTotals(dailyTotals(new Scope(idx, base), { from: "2026-09-01", to: "2026-09-30" }).values());
    expect(f.revenue).toBeCloseTo(t.revenue);
    expect(f.leads).toBe(t.leads);
    expect(f.sales).toBeCloseTo(t.sales);
  });
});
