import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/mock/generate.ts";
import { buildIndex, funnelCohort, NEXT_OF, Scope, stalls } from "../src/data/mock/engine.ts";
import type { Filters } from "../src/types/filters.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const idx = buildIndex(ds);
const base: Filters = {
  preset: "custom",
  from: "2026-07-01",
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

describe("где остановились и дожимы", () => {
  const { counts } = funnelCohort(new Scope(idx, base), r);
  const rows = stalls(new Scope(idx, base), r);

  it("«дошли» совпадает с воронкой, «застряли» = шаг − следующий шаг", () => {
    for (const s of rows) {
      expect(s.reached).toBe(counts[s.step]);
      expect(s.stuck).toBe(counts[s.step] - counts[NEXT_OF[s.step]]);
    }
  });

  it("у каждого шага своя серия постов, возвраты не превышают отправки и клики", () => {
    for (const s of rows) {
      expect(s.messages.size).toBeGreaterThanOrEqual(2);
      for (const m of s.messages.values()) {
        expect(m.clicked).toBeLessThanOrEqual(m.sent);
        expect(m.converted).toBeLessThanOrEqual(m.sent);
        expect(m.blocked).toBeLessThanOrEqual(m.sent);
      }
      expect(s.returned).toBeLessThanOrEqual(s.nurtured);
      expect(s.returned).toBeLessThanOrEqual(counts[NEXT_OF[s.step]]);
    }
  });

  it("дожимы действительно возвращают клиентов", () => {
    expect(rows.reduce((sum, s) => sum + s.returned, 0)).toBeGreaterThan(100);
  });

  it("фильтр по источнику сужает когорту, сумма по источникам не меньше общей", () => {
    const parts = ds.sources.map((s) => funnelCohort(new Scope(idx, { ...base, sourceIds: [s.id] }), r).counts);
    for (const p of parts) expect(p.click).toBeLessThan(counts.click);
    // Визитёр с касаниями из разных источников попадает в когорту каждого из них
    expect(parts.reduce((s, p) => s + p.click, 0)).toBeGreaterThanOrEqual(counts.click);
  });

  it("кросс-фильтр шага: в когорте только дошедшие", () => {
    const only = funnelCohort(new Scope(idx, { ...base, funnelStep: "lesson_3" }), r).counts;
    expect(only.click).toBe(counts.lesson_3);
    expect(only.lesson_3).toBe(counts.lesson_3);
    expect(only.payment).toBe(counts.payment);
  });
});
