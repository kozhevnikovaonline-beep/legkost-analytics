import { describe, expect, it } from "vitest";
import { clampRange, presetRange, previousRange, rangeDays } from "../src/lib/period.ts";
import { filtersToQuery, queryToFilters } from "../src/lib/urlFilters.ts";
import type { Filters } from "../src/types/filters.ts";

const defaults: Filters = {
  preset: "30d",
  from: "2026-10-18",
  to: "2026-11-16",
  compare: "previous_period",
  attribution: "last_click",
  sourceIds: [],
  campaignIds: [],
  adIds: [],
  productIds: [],
  managerIds: [],
  funnelStep: null,
};

describe("периоды", () => {
  it("пресеты заканчиваются сегодня включительно", () => {
    expect(presetRange("today", "2026-11-16")).toEqual({ from: "2026-11-16", to: "2026-11-16" });
    expect(presetRange("7d", "2026-11-16")).toEqual({ from: "2026-11-10", to: "2026-11-16" });
    expect(rangeDays(presetRange("90d", "2026-11-16"))).toBe(90);
  });
  it("прошлый период той же длины идёт сразу перед текущим", () => {
    expect(previousRange({ from: "2026-11-10", to: "2026-11-16" })).toEqual({ from: "2026-11-03", to: "2026-11-09" });
    expect(previousRange({ from: "2026-11-01", to: "2026-11-01" })).toEqual({ from: "2026-10-31", to: "2026-10-31" });
  });
  it("диапазон ограничивается датами, за которые есть данные", () => {
    expect(clampRange({ from: "2026-01-01", to: "2026-12-31" }, "2026-05-21", "2026-11-16")).toEqual({ from: "2026-05-21", to: "2026-11-16" });
  });
});

describe("фильтры в адресе", () => {
  it("туда и обратно без потерь", () => {
    const f: Filters = { ...defaults, preset: "custom", from: "2026-09-01", to: "2026-09-30", compare: "none", attribution: "linear", sourceIds: ["vk_ads", "tg_ads"], campaignIds: ["cmp-00004"], funnelStep: "lesson_2" };
    const q = filtersToQuery(f);
    expect(q).toContain("src=vk_ads,tg_ads");
    expect(queryToFilters(q, defaults)).toEqual(f);
  });
  it("значения по умолчанию не засоряют ссылку", () => {
    expect(filtersToQuery(defaults)).toBe("p=30d");
  });
  it("мусор в ссылке игнорируется", () => {
    const f = queryToFilters("p=year&src=google,vk_ads&step=hack&from=bad", defaults);
    expect(f.preset).toBe("30d");
    expect(f.sourceIds).toEqual(["vk_ads"]);
    expect(f.funnelStep).toBeNull();
  });
  it("кривой свой диапазон откатывается к пресету по умолчанию", () => {
    expect(queryToFilters("p=custom&from=2026-10-10&to=2026-10-01", defaults).preset).toBe("30d");
  });
});
