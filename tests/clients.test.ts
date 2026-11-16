import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/mock/generate.ts";
import { buildIndex } from "../src/data/mock/engine.ts";
import { clientCard, listClients } from "../src/data/mock/clients.ts";
import type { ClientQuery } from "../src/types/dto.ts";
import type { Filters } from "../src/types/filters.ts";

const ds = generateDataset({ endDate: "2026-11-16" });
const idx = buildIndex(ds);
const f: Filters = {
  preset: "custom",
  from: "2026-10-01",
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
const q: ClientQuery = { segment: "period", search: "", status: null, tag: null, onlyPaying: false, sort: "createdAt", desc: true, page: 0, pageSize: 50 };
const inOct = (iso: string) => iso >= "2026-09-30T21:00:00.000Z" && iso < "2026-10-31T21:00:00.000Z";

describe("клиенты", () => {
  it("сегмент «за период» — пользователи, запустившие бота в периоде; страницы по 50", () => {
    const page = listClients(idx, f, q);
    expect(page.total).toBe(ds.users.filter((u) => inOct(u.createdAt)).length);
    expect(page.rows).toHaveLength(50);
    expect(page.rows.every((r) => inOct(r.createdAt))).toBe(true);
    const second = listClients(idx, f, { ...q, page: 1 });
    expect(second.rows[0]!.userId).not.toBe(page.rows[0]!.userId);
  });

  it("«все клиенты» шире сегмента периода и включают клиенток прошлого сезона", () => {
    const all = listClients(idx, f, { ...q, segment: "all" });
    expect(all.total).toBeGreaterThan(listClients(idx, f, q).total);
    expect(all.tags).toContain("с прошлого сезона");
  });

  it("поиск, статус, тег, только платящие и сортировка по LTV", () => {
    const name = listClients(idx, f, q).rows[0]!.name;
    const found = listClients(idx, f, { ...q, search: name.toLowerCase() });
    expect(found.rows.every((r) => r.name === name || (r.username ?? "").includes(name.toLowerCase()))).toBe(true);
    const won = listClients(idx, f, { ...q, status: "won", pageSize: 1000 });
    expect(won.rows.every((r) => r.status === "won")).toBe(true);
    const paying = listClients(idx, f, { ...q, onlyPaying: true, sort: "ltv", pageSize: 1000 });
    expect(paying.rows.every((r) => r.orders > 0)).toBe(true);
    for (let i = 1; i < paying.rows.length; i++) expect(paying.rows[i]!.ltv).toBeLessThanOrEqual(paying.rows[i - 1]!.ltv);
    expect(paying.summary.paying).toBe(paying.total);
  });

  it("фильтр источника оставляет только клиентов с касанием из него", () => {
    const vk = listClients(idx, { ...f, sourceIds: ["vk_ads"] }, { ...q, pageSize: 5000 });
    expect(vk.total).toBeGreaterThan(0);
    for (const r of vk.rows) expect((idx.touchesByUser.get(r.userId) ?? []).some((t) => t.sourceId === "vk_ads")).toBe(true);
  });

  it("карточка: LTV = сумма оплат, хронология от новых к старым, шаги по порядку", () => {
    const payer = listClients(idx, f, { ...q, onlyPaying: true, sort: "ltv" }).rows[0]!;
    const card = clientCard(idx, f, payer.userId)!;
    const paid = ds.payments.filter((p) => p.userId === payer.userId).reduce((s, p) => s + p.amount, 0);
    expect(card.row.ltv).toBe(Math.round(paid));
    for (let i = 1; i < card.timeline.length; i++) expect(card.timeline[i]!.at <= card.timeline[i - 1]!.at).toBe(true);
    expect(card.timeline.some((t) => t.kind === "payment")).toBe(true);
    expect(card.steps.find((s) => s.step === "payment")!.at).not.toBeNull();
    expect(clientCard(idx, f, "нет-такого")).toBeNull();
  });
});
