import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/mock/generate.ts";
import { buildIndex, dailyTotals, paymentsByKind, salesByManager, salesByProduct, salesTotals, Scope, sumTotals } from "../src/data/mock/engine.ts";
import { salesKpis } from "../src/lib/kpi.ts";
import type { Filters } from "../src/types/filters.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const idx = buildIndex(ds);
const base: Filters = {
  preset: "custom",
  from: "2026-08-01",
  to: "2026-10-31",
  compare: "none",
  attribution: "last_click",
  sourceIds: [],
  campaignIds: [],
  adIds: [],
  productIds: [],
  managerIds: [],
  funnelStep: null,
};
const r = { from: base.from, to: base.to };
const scope = new Scope(idx, base);
const s = salesTotals(scope, r);

describe("продажи", () => {
  it("net = gross − возвраты и совпадает с выручкой сводки", () => {
    expect(s.net).toBeCloseTo(s.gross - s.refunds, 4);
    expect(s.net).toBeCloseTo(sumTotals(dailyTotals(scope, r).values()).revenue, 4);
  });

  it("выручка по продуктам и по типам платежей в сумме дают net", () => {
    const byProduct = [...salesByProduct(scope, r).values()].reduce((a, x) => a + x.revenue, 0);
    const kinds = paymentsByKind(scope, r);
    const byKind = Object.values(kinds).reduce((a, x) => a + x.amount, 0);
    expect(byProduct).toBeCloseTo(s.net, 4);
    expect(byKind).toBeCloseTo(s.net, 4);
    expect(kinds.refund.amount).toBeCloseTo(-s.refunds, 4);
  });

  it("продажи менеджеров = продажи заказов с менеджером, фильтр менеджера даёт ту же выручку", () => {
    const managers = salesByManager(scope, r);
    for (const m of ds.managers) {
      const only = salesTotals(new Scope(idx, { ...base, managerIds: [m.id] }), r);
      expect(managers.get(m.id)!.revenue).toBeCloseTo(only.net, 4);
      expect(managers.get(m.id)!.sales).toBeCloseTo(only.sales, 4);
    }
  });

  it("KPI продаж согласованы", () => {
    const k = salesKpis(s);
    expect(k.avgCheck).toBeCloseTo(s.net / s.sales);
    expect(k.arppu!).toBeGreaterThan(k.arpu!);
    expect(k.installmentShare!).toBeGreaterThan(0);
    expect(k.installmentShare!).toBeLessThan(1);
    expect(s.payments).toBeGreaterThanOrEqual(s.sales);
    expect(s.orders).toBeGreaterThanOrEqual(s.sales * 0.9);
  });

  it("продукт в фильтре: в разбивке остаётся только он", () => {
    const only = salesByProduct(new Scope(idx, { ...base, productIds: ["group"] }), r);
    expect([...only.keys()]).toEqual(["group"]);
  });
});
