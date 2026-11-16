import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generateDataset } from "../src/data/mock/generate.ts";
import { addTraffic, buildIndex, dailyTotals, emptyTraffic, Scope, sumTotals, trafficByAd } from "../src/data/mock/engine.ts";
import { trafficMetrics } from "../src/lib/kpi.ts";
import { toCsv, type ExportColumn } from "../src/lib/export.ts";
import type { Filters } from "../src/types/filters.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const idx = buildIndex(ds);
const base: Filters = {
  preset: "custom",
  from: "2026-09-01",
  to: "2026-10-31",
  compare: "none",
  attribution: "linear",
  sourceIds: [],
  campaignIds: [],
  adIds: [],
  productIds: [],
  managerIds: [],
  funnelStep: null,
};
const r = { from: base.from, to: base.to };

describe("таблица трафика", () => {
  const byAd = trafficByAd(new Scope(idx, base), r);
  const all = [...byAd.values()].reduce(addTraffic, emptyTraffic());
  const totals = sumTotals(dailyTotals(new Scope(idx, base), r).values());

  it("сумма по объявлениям сходится с итогами сводки", () => {
    expect(all.spend).toBe(totals.spend);
    expect(all.leads).toBeCloseTo(totals.leads, 4);
    expect(all.revenue).toBeCloseTo(totals.revenue, 4);
    expect(all.sales).toBeCloseTo(totals.sales, 4);
  });

  it("клики = визиты с меткой за период, платные клики — только у платных источников", () => {
    const inR = ds.touchpoints.filter((t) => t.at >= "2026-08-31T21:00:00.000Z" && t.at < "2026-10-31T21:00:00.000Z");
    expect(all.clicks).toBe(inR.length);
    const paid = new Set(ds.sources.filter((s) => s.isPaid).map((s) => s.id));
    expect(all.paidClicks).toBe(inR.filter((t) => paid.has(t.sourceId)).length);
  });

  it("фильтр по объявлению оставляет только его строку", () => {
    const adId = ds.ads[0]!.id;
    const only = trafficByAd(new Scope(idx, { ...base, adIds: [adId] }), r);
    expect([...only.keys()]).toEqual([adId]);
  });

  it("у бесплатных источников нет CPL и CAC, у платных — есть", () => {
    const free = trafficMetrics({ ...emptyTraffic(), clicks: 100, leads: 20 });
    expect(free.cpl).toBeNull();
    expect(free.cac).toBeNull();
    const paid = trafficMetrics({ ...emptyTraffic(), impressions: 10_000, clicks: 120, paidClicks: 100, spend: 5000, leads: 25, newCustomers: 4 });
    expect(paid.ctr).toBe(0.01);
    expect(paid.cpc).toBe(50);
    expect(paid.cpl).toBe(200);
    expect(paid.cac).toBe(1250);
  });
});

describe("экспорт", () => {
  const rows = [
    { name: "Посевы; рецепты", spend: 1234.5, romi: 0.25 },
    { name: 'Канал "ПП"', spend: 0, romi: null },
  ];
  const cols: ExportColumn<(typeof rows)[number]>[] = [
    { header: "Название", value: (r) => r.name },
    { header: "Расход", value: (r) => r.spend },
    { header: "ROMI", value: (r) => r.romi },
  ];

  it("CSV для русского Excel: BOM, «;», запятая в дробях, экранирование", () => {
    const csv = toCsv(cols, rows);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n")).toEqual(["﻿Название;Расход;ROMI", '"Посевы; рецепты";1234,5;0,25', '"Канал ""ПП""";0;']);
  });

  it("XLSX собирается и читается обратно", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Трафик");
    ws.columns = cols.map((c) => ({ header: c.header }));
    for (const r of rows) ws.addRow(cols.map((c) => c.value(r)));
    const buf = await wb.xlsx.writeBuffer();
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf);
    expect(back.getWorksheet("Трафик")!.getRow(2).getCell(1).value).toBe("Посевы; рецепты");
  });
});
