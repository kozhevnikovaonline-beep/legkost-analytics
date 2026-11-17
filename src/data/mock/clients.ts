/** Клиенты: список с поиском и фильтрами, карточка с хронологией касаний, дожимов и покупок */
import type { AppEvent, FunnelStep, ID, Payment, Touchpoint } from "../../types/domain.ts";
import { FUNNEL_STEPS } from "../../types/domain.ts";
import type { Filters } from "../../types/filters.ts";
import type { ClientCard, ClientOrder, ClientQuery, ClientRow, Page, TimelineItem } from "../../types/dto.ts";
import { mskDay, toIso } from "../../lib/dates.ts";
import { duration, rub } from "../../lib/format.ts";
import { Scope, type Index } from "./engine.ts";

const PAID = ["paid", "installment", "refunded"];

/** Последняя активность пользователя (события и оплаты), кэшируется на индекс */
const activityCache = new WeakMap<Index, Map<ID, string>>();
function lastActivity(idx: Index): Map<ID, string> {
  let m = activityCache.get(idx);
  if (!m) {
    m = new Map();
    const bump = (userId: ID, at: string) => {
      if ((m!.get(userId) ?? "") < at) m!.set(userId, at);
    };
    for (const u of idx.ds.users) bump(u.id, u.createdAt);
    for (const e of idx.ds.events) bump(e.userId, e.at);
    for (const p of idx.ds.payments) bump(p.userId, p.at);
    activityCache.set(idx, m);
  }
  return m;
}

function furthestStep(idx: Index, userId: ID): FunnelStep {
  const st = idx.steps.get(userId) ?? {};
  let last: FunnelStep = "click";
  for (const s of FUNNEL_STEPS) if (st[s] !== undefined) last = s;
  return last;
}

export function clientRow(idx: Index, scope: Scope, userId: ID): ClientRow {
  const u = idx.ds.users.find((x) => x.id === userId)!;
  return buildRow(idx, scope, u.id, lastActivity(idx));
}

function buildRow(idx: Index, scope: Scope, userId: ID, activity: Map<ID, string>): ClientRow {
  const u = userById(idx).get(userId)!;
  // Источник клиента — касание с наибольшим весом в выбранной модели атрибуции
  const top = [...scope.userShares(userId)].sort((a, b) => b.weight - a.weight)[0];
  const lead = leadByUser(idx).get(userId);
  const orders = idx.ordersByUser.get(userId) ?? [];
  return {
    userId,
    name: u.firstName,
    username: u.username,
    createdAt: u.createdAt,
    sourceId: top?.sourceId ?? null,
    sourceName: top ? (sourceName(idx).get(top.sourceId) ?? null) : null,
    campaignName: top?.campaignId ? (campaignName(idx).get(top.campaignId) ?? null) : null,
    step: furthestStep(idx, userId),
    status: lead?.status ?? null,
    orders: orders.filter((o) => PAID.includes(o.status)).length,
    ltv: Math.round(idx.lifetime.get(userId) ?? 0),
    lastActivityAt: activity.get(userId) ?? u.createdAt,
    managerName: u.managerId ? (managerName(idx).get(u.managerId) ?? null) : null,
    tags: u.tags,
    blocked: !!u.botBlockedAt,
  };
}

// Справочники (кэш на индекс)
const memo = <T>(fn: (idx: Index) => T) => {
  const cache = new WeakMap<Index, T>();
  return (idx: Index): T => {
    let v = cache.get(idx);
    if (v === undefined) cache.set(idx, (v = fn(idx)));
    return v;
  };
};
const userById = memo((idx) => new Map(idx.ds.users.map((u) => [u.id, u])));
const leadByUser = memo((idx) => new Map(idx.ds.leads.map((l) => [l.userId, l])));
const sourceName = memo((idx) => new Map<string, string>(idx.ds.sources.map((s) => [s.id, s.name])));
const campaignName = memo((idx) => new Map(idx.ds.campaigns.map((c) => [c.id, c.name])));
const adName = memo((idx) => new Map(idx.ds.ads.map((a) => [a.id, a.name])));
const managerName = memo((idx) => new Map(idx.ds.managers.map((m) => [m.id, m.name])));
const productById = memo((idx) => new Map(idx.ds.products.map((p) => [p.id, p])));

/** Список клиентов: сегмент, глобальные фильтры, поиск, статус, тег, сортировка, страница */
export function listClients(idx: Index, f: Filters, q: ClientQuery): Page<ClientRow> {
  const scope = new Scope(idx, f);
  const activity = lastActivity(idx);
  const search = q.search.trim().toLowerCase().replace(/^@/, "");
  const all: ClientRow[] = [];
  for (const u of idx.ds.users) {
    const day = mskDay(u.createdAt);
    if (q.segment === "period" ? day < f.from || day > f.to : day > f.to) continue;
    if (scope.userWeight(u.id) === 0) continue;
    if (f.managerIds.length && (!u.managerId || !f.managerIds.includes(u.managerId))) continue;
    if (f.productIds.length && !(idx.ordersByUser.get(u.id) ?? []).some((o) => PAID.includes(o.status) && f.productIds.includes(o.productId))) continue;
    if (search && !`${u.firstName} ${u.username ?? ""} ${u.id}`.toLowerCase().includes(search)) continue;
    const row = buildRow(idx, scope, u.id, activity);
    if (q.status === "no_lead" ? row.status !== null : q.status && row.status !== q.status) continue;
    if (q.tag && !row.tags.includes(q.tag)) continue;
    if (q.onlyPaying && row.orders === 0) continue;
    all.push(row);
  }
  const key: Record<ClientQuery["sort"], (r: ClientRow) => string | number> = {
    createdAt: (r) => r.createdAt,
    ltv: (r) => r.ltv,
    lastActivity: (r) => r.lastActivityAt,
    orders: (r) => r.orders,
  };
  const k = key[q.sort];
  all.sort((a, b) => {
    const x = k(a);
    const y = k(b);
    const c = x < y ? -1 : x > y ? 1 : 0;
    return q.desc ? -c : c;
  });
  const paying = all.filter((r) => r.orders > 0);
  const ltv = paying.reduce((s, r) => s + r.ltv, 0);
  const start = q.page * q.pageSize;
  return {
    rows: all.slice(start, start + q.pageSize),
    total: all.length,
    page: q.page,
    pageSize: q.pageSize,
    summary: { clients: all.length, paying: paying.length, ltv, avgLtv: paying.length ? ltv / paying.length : null },
    tags: [...new Set(all.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "ru")),
  };
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const PLATFORM: Record<string, string> = { ios: "iPhone", android: "Android", tdesktop: "Telegram Desktop", web: "веб-версия" };
const PAYMENT_LABEL: Record<Payment["kind"], string> = { full: "Оплата", installment: "Платёж по рассрочке", subscription: "Продление клуба", refund: "Возврат" };

function touchInfo(idx: Index, tp: Touchpoint | undefined) {
  if (!tp) return null;
  return {
    sourceName: sourceName(idx).get(tp.sourceId) ?? tp.sourceId,
    campaignName: tp.campaignId ? (campaignName(idx).get(tp.campaignId) ?? null) : null,
    adName: tp.adId ? (adName(idx).get(tp.adId) ?? null) : null,
    at: tp.at,
  };
}

function eventItem(idx: Index, e: AppEvent): TimelineItem | null {
  switch (e.type) {
    case "bot_start":
      return { at: e.at, kind: "event", title: "Запустила бота", detail: e.payload.startParam ? `метка: ${e.payload.startParam}` : null, tone: "neutral" };
    case "webapp_open":
      return { at: e.at, kind: "event", title: "Открыла приложение", detail: [PLATFORM[e.payload.platform], e.payload.startParam?.startsWith("nurture_") ? "по кнопке дожима" : null].filter(Boolean).join(" · ") || null, tone: "neutral" };
    case "onboarded":
      return { at: e.at, kind: "event", title: "Прошла приветствие — стала лидом", detail: "Открыт доступ к 3 бесплатным урокам", tone: "accent" };
    case "lesson_completed":
      return { at: e.at, kind: "event", title: `Урок ${e.payload.lesson} пройден`, detail: "+300 лепестков", tone: "accent" };
    case "quiz_completed":
      return { at: e.at, kind: "event", title: e.payload.quiz === "type" ? "Тест «Тип набора веса»" : "Тест «Подбор формата»", detail: `Результат: ${e.payload.result}`, tone: "neutral" };
    case "guide_unlocked":
      return { at: e.at, kind: "event", title: `Открыла ${lowerFirst(productById(idx).get(e.payload.productId)?.name ?? "гайд")}`, detail: e.payload.paidWith === "petals" ? "за лепестки" : "за рубли", tone: "neutral" };
    case "bot_blocked":
      return { at: e.at, kind: "event", title: "Заблокировала бота", detail: "Дожимы больше не отправляются", tone: "negative" };
    case "checkout_opened":
    case "nurture_clicked":
      return null; // показываются в заказах и дожимах
  }
}

export function clientCard(idx: Index, f: Filters, userId: ID): ClientCard | null {
  const u = userById(idx).get(userId);
  if (!u) return null;
  const scope = new Scope(idx, { ...f, sourceIds: [], campaignIds: [], adIds: [], funnelStep: null });
  const row = buildRow(idx, scope, userId, lastActivity(idx));
  const touches = idx.touchesByUser.get(userId) ?? [];
  const st = idx.steps.get(userId) ?? {};
  const products = productById(idx);
  const msgs = new Map(idx.ds.nurtureMessages.map((m) => [m.id, m]));

  const payments = idx.ds.payments.filter((p) => p.userId === userId);
  const orders: ClientOrder[] = (idx.ordersByUser.get(userId) ?? []).map((o) => {
    const p = products.get(o.productId)!;
    return {
      orderId: o.id,
      productName: p.name,
      planLabel: p.plans.find((x) => x.id === o.planId)?.label ?? o.planId,
      createdAt: o.createdAt,
      amount: o.amount,
      discountRub: o.discountRub,
      paid: (idx.paymentsByOrder.get(o.id) ?? []).reduce((s, x) => s + x.amount, 0),
      status: o.status,
      installmentMonths: o.installmentMonths,
      managerName: o.managerId ? (managerName(idx).get(o.managerId) ?? null) : null,
      isRepeat: o.isRepeat,
    };
  });

  const deliveries = idx.ds.nurtureDeliveries.filter((d) => d.userId === userId);
  const timeline: TimelineItem[] = [
    ...touches.map((tp): TimelineItem => {
      const t = touchInfo(idx, tp)!;
      return { at: tp.at, kind: "touch", title: `Переход: ${t.sourceName}`, detail: [t.campaignName, t.adName].filter(Boolean).join(" · ") || null, tone: "neutral" };
    }),
    ...idx.ds.events.filter((e) => e.userId === userId).map((e) => eventItem(idx, e)).filter((x): x is TimelineItem => x !== null),
    ...deliveries.map((d): TimelineItem => {
      const m = msgs.get(d.messageId)!;
      const reaction = d.status === "blocked" ? "после поста заблокировала бота" : d.status === "failed" ? "не доставлен" : d.convertedAt ? `перешла на следующий шаг через ${duration((Date.parse(d.convertedAt) - Date.parse(d.sentAt)) / 60_000)}` : d.clickedAt ? "нажала кнопку, но не продолжила" : "без реакции";
      return { at: d.sentAt, kind: "nurture", title: `Дожим: «${m.title}»`, detail: reaction, tone: d.convertedAt ? "positive" : d.status === "blocked" ? "negative" : "neutral" };
    }),
    ...orders.map((o): TimelineItem => ({
      at: o.createdAt,
      kind: "order",
      title: `${o.isRepeat ? "Повторный заказ" : "Заказ"}: ${o.productName}`,
      detail: [o.planLabel, rub(o.amount), o.discountRub ? `скидка лепестками ${rub(o.discountRub)}` : null, o.installmentMonths ? `рассрочка на ${o.installmentMonths} мес.` : null].filter(Boolean).join(" · "),
      tone: "accent",
    })),
    ...payments.map((p): TimelineItem => ({
      at: p.at,
      kind: "payment",
      title: `${PAYMENT_LABEL[p.kind]}${p.installmentNo ? ` №${p.installmentNo}` : ""}: ${rub(Math.abs(p.amount))}`,
      detail: products.get(idx.orderById.get(p.orderId)!.productId)?.name ?? null,
      tone: p.amount < 0 ? "negative" : "positive",
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const firstPaid = idx.firstPaidAt.get(userId);
  return {
    row,
    tgUserId: u.tgUserId,
    firstTouch: touchInfo(idx, touches[0]),
    lastTouch: touchInfo(idx, touches.at(-1)),
    steps: FUNNEL_STEPS.map((step) => ({ step, at: st[step] !== undefined ? toIso(st[step]!) : null })),
    orders: orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    firstPaidAt: firstPaid ? toIso(firstPaid) : null,
    nurture: { sent: deliveries.filter((d) => d.status !== "failed").length, clicked: deliveries.filter((d) => d.clickedAt).length, converted: deliveries.filter((d) => d.convertedAt).length },
    timeline,
  };
}
