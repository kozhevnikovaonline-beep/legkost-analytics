import { describe, expect, it } from "vitest";
import * as m from "../src/lib/metrics.ts";

describe("формулы рекламы", () => {
  it("CTR, CPC, CPM, CPL", () => {
    expect(m.ctr(25, 1000)).toBe(0.025);
    expect(m.cpc(5000, 100)).toBe(50);
    expect(m.cpm(5000, 20000)).toBe(250);
    expect(m.cpl(6000, 40)).toBe(150);
  });
  it("деление на ноль даёт null, а не Infinity", () => {
    expect(m.ctr(10, 0)).toBeNull();
    expect(m.cpc(100, 0)).toBeNull();
    expect(m.cpm(100, 0)).toBeNull();
    expect(m.cac(100, 0)).toBeNull();
    expect(m.romi(100, 0)).toBeNull();
    expect(m.mean([])).toBeNull();
  });
});

describe("деньги", () => {
  it("ROMI и ROAS", () => {
    expect(m.romi(150_000, 100_000)).toBe(0.5);
    expect(m.romi(60_000, 100_000)).toBe(-0.4);
    expect(m.roas(150_000, 100_000)).toBe(1.5);
    expect(m.profit(150_000, 100_000)).toBe(50_000);
  });
  it("средний чек, ARPU, ARPPU, CAC", () => {
    expect(m.avgCheck(30_000, 10)).toBe(3000);
    expect(m.arpu(30_000, 300)).toBe(100);
    expect(m.arppu(30_000, 12)).toBe(2500);
    expect(m.cac(40_000, 8)).toBe(5000);
  });
  it("LTV, LTV/CAC, churn, возвраты", () => {
    expect(m.ltv([1000, 3000, 8000])).toBe(4000);
    expect(m.ltvCac(15_000, 5000)).toBe(3);
    expect(m.ltvCac(null, 5000)).toBeNull();
    expect(m.churn(27, 100)).toBe(0.27);
    expect(m.refundRate(-6000, 100_000)).toBe(0.06);
  });
  it("изменение к прошлому периоду и план", () => {
    expect(m.change(120, 100)).toBeCloseTo(0.2);
    expect(m.change(80, 100)).toBeCloseTo(-0.2);
    expect(m.change(-50, -100)).toBeCloseTo(0.5);
    expect(m.change(10, 0)).toBeNull();
    expect(m.planProgress(450, 500)).toBe(0.9);
    expect(m.runRate(300, 10, 30)).toBe(900);
  });
});

describe("воронка", () => {
  it("CR к предыдущему и первому шагу, потери", () => {
    const f = m.funnel([1000, 400, 100]);
    expect(f[0]).toEqual({ count: 1000, crPrev: null, crFirst: null, lost: 0 });
    expect(f[1]).toEqual({ count: 400, crPrev: 0.4, crFirst: 0.4, lost: 600 });
    expect(f[2]).toEqual({ count: 100, crPrev: 0.25, crFirst: 0.1, lost: 300 });
  });
  it("медиана", () => {
    expect(m.median([5, 1, 3])).toBe(3);
    expect(m.median([4, 1, 3, 2])).toBe(2.5);
    expect(m.median([])).toBeNull();
  });
  it("у каждой метрики есть формула для тултипа", () => {
    for (const def of Object.values(m.METRICS)) expect(def.formula.length).toBeGreaterThan(5);
  });
});
