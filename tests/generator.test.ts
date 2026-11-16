import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/mock/generate.ts";
import { romi } from "../src/lib/metrics.ts";
import type { AppEvent } from "../src/types/domain.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const PAID = ["paid", "installment", "refunded"];

describe("генератор демо-данных", () => {
  it("детерминирован: одинаковый seed — одинаковые данные", () => {
    const again = generateDataset({ endDate: "2026-11-16" });
    expect(again.payments.length).toBe(ds.payments.length);
    expect(JSON.stringify(again.orders.slice(0, 50))).toBe(JSON.stringify(ds.orders.slice(0, 50)));
    expect(JSON.stringify(again.adCosts.slice(-50))).toBe(JSON.stringify(ds.adCosts.slice(-50)));
    const other = generateDataset({ endDate: "2026-11-16", seed: 7 });
    expect(other.payments.length).not.toBe(ds.payments.length);
  });

  it("180 дней истории", () => {
    expect(ds.generatedFor.startDate).toBe("2026-05-21");
    expect(ds.touchpoints[0]!.at >= "2026-05-20T21:00:00.000Z").toBe(true);
    expect(ds.touchpoints.at(-1)!.at < "2026-11-16T21:00:00.000Z").toBe(true);
  });

  it("объёмы по ТЗ: ~15 000 визитов, ~3 000 лидов, ~400 оплаченных заказов", () => {
    expect(ds.touchpoints.length).toBeGreaterThan(13_000);
    expect(ds.touchpoints.length).toBeLessThan(17_000);
    expect(ds.leads.length).toBeGreaterThan(2_600);
    expect(ds.leads.length).toBeLessThan(3_500);
    const paid = ds.orders.filter((o) => PAID.includes(o.status)).length;
    expect(paid).toBeGreaterThan(330);
    expect(paid).toBeLessThan(500);
  });

  it("возвраты 4–8% оплаченных заказов, есть рассрочки, подписки и повторные покупки", () => {
    const paid = ds.orders.filter((o) => PAID.includes(o.status));
    const share = paid.filter((o) => o.status === "refunded").length / paid.length;
    expect(share).toBeGreaterThan(0.04);
    expect(share).toBeLessThan(0.08);
    expect(ds.payments.some((p) => p.kind === "installment" && (p.installmentNo ?? 0) > 1)).toBe(true);
    expect(ds.payments.some((p) => p.kind === "subscription")).toBe(true);
    expect(ds.orders.some((o) => o.isRepeat && o.status === "paid")).toBe(true);
  });

  it("продукты и цены — как в приложении, скидка лепестками не больше 20%", () => {
    const prices = new Map(ds.products.flatMap((p) => p.plans.map((pl) => [`${p.id}:${pl.id}`, pl.priceRub] as const)));
    for (const o of ds.orders) {
      expect(o.listPrice).toBe(prices.get(`${o.productId}:${o.planId}`));
      expect(o.amount).toBe(o.listPrice - o.discountRub);
      expect(o.discountRub).toBeLessThanOrEqual(o.listPrice * 0.2);
    }
  });

  it("оплаты по заказу не превышают сумму заказа, возврат обнуляет", () => {
    const byOrder = new Map<string, number>();
    for (const p of ds.payments) byOrder.set(p.orderId, (byOrder.get(p.orderId) ?? 0) + p.amount);
    for (const o of ds.orders) {
      const paid = byOrder.get(o.id) ?? 0;
      if (o.status === "refunded") expect(paid).toBe(0);
      else if (o.productId !== "club") expect(paid).toBeLessThanOrEqual(o.amount);
    }
  });

  it("один платный источник убыточный, остальные окупаются", () => {
    const lastTouch = new Map<string, string>();
    for (const tp of ds.touchpoints) if (tp.userId) lastTouch.set(tp.userId, tp.sourceId);
    const adSrc = new Map(ds.ads.map((a) => [a.id, ds.campaigns.find((c) => c.id === a.campaignId)!.sourceId]));
    const spend = new Map<string, number>();
    for (const c of ds.adCosts) {
      const s = adSrc.get(c.adId)!;
      spend.set(s, (spend.get(s) ?? 0) + c.spend);
    }
    const revenue = new Map<string, number>();
    for (const p of ds.payments) {
      const s = lastTouch.get(p.userId)!;
      revenue.set(s, (revenue.get(s) ?? 0) + p.amount);
    }
    const paidRomi = ds.sources.filter((s) => s.isPaid).map((s) => romi(revenue.get(s.id) ?? 0, spend.get(s.id) ?? 0)!);
    expect(paidRomi.filter((r) => r < 0)).toHaveLength(1);
  });

  it("воронка монотонна: каждый следующий шаг не больше предыдущего", () => {
    const users = (pred: (e: AppEvent) => boolean) => new Set(ds.events.filter(pred).map((e) => e.userId)).size;
    const lesson = (n: number) => users((e) => e.type === "lesson_completed" && e.payload.lesson === n);
    const counts = [
      new Set(ds.touchpoints.map((t) => t.visitorId)).size,
      users((e) => e.type === "bot_start"),
      users((e) => e.type === "webapp_open"),
      users((e) => e.type === "onboarded"),
      lesson(1),
      lesson(2),
      lesson(3),
      new Set(ds.orders.filter((o) => !o.isRepeat).map((o) => o.userId)).size,
      new Set(ds.orders.filter((o) => !o.isRepeat && PAID.includes(o.status)).map((o) => o.userId)).size,
    ];
    for (let i = 1; i < counts.length; i++) expect(counts[i]!).toBeLessThanOrEqual(counts[i - 1]!);
  });

  it("дожимные посты: есть клики и возвраты, заблокировавшие бота не получают постов", () => {
    expect(ds.nurtureDeliveries.some((d) => d.clickedAt)).toBe(true);
    expect(ds.nurtureDeliveries.some((d) => d.convertedAt)).toBe(true);
    const blockedAt = new Map(ds.users.filter((u) => u.botBlockedAt).map((u) => [u.id, u.botBlockedAt!]));
    for (const d of ds.nurtureDeliveries) {
      const b = blockedAt.get(d.userId);
      if (b && d.status === "sent") expect(d.sentAt <= b).toBe(true);
    }
  });

  it("нет событий из будущего", () => {
    const now = Date.parse("2026-11-16T12:00:00Z");
    const cut = generateDataset({ endDate: "2026-11-16", now });
    const iso = new Date(now).toISOString();
    expect(cut.events.every((e) => e.at <= iso)).toBe(true);
    expect(cut.payments.every((p) => p.at <= iso)).toBe(true);
    expect(cut.touchpoints.every((t) => t.at <= iso)).toBe(true);
  });

  it("план есть на каждый месяц периода", () => {
    const months = new Set(ds.plans.map((p) => p.month));
    expect(months.size).toBe(7);
    expect(ds.plans.every((p) => p.value > 0)).toBe(true);
  });
});
