/**
 * Seed-генератор демо-данных за 180 дней.
 *
 * Путь клиента: клик (utm) → старт бота → открытие Web App → лид (приветствие) → уроки 1–3
 * → заказ → оплата → повторная оплата. На каждом шаге, где клиент остановился, бот шлёт
 * серию дожимных постов (config.NURTURE); пост может вернуть клиента в воронку.
 *
 * Одинаковые seed + endDate → одинаковый результат. Всё, что позже `now`, не генерируется
 * (нет «будущих» событий), поэтому пресет «Сегодня» показывает данные на текущий момент.
 */
import type {
  Ad,
  AdCost,
  AppEvent,
  Campaign,
  Dataset,
  ID,
  ISODate,
  Lead,
  NurtureDelivery,
  NurtureMessage,
  Order,
  Payment,
  Platform,
  PlanTarget,
  Product,
  SourceId,
  StallStep,
  Touchpoint,
  User,
} from "../../types/domain.ts";
import { addDays, DAY_MS, mskDay, mskDayStart, mskMonth, mskWeekday, toIso } from "../../lib/dates.ts";
import { createRng, type Rng } from "./rng.ts";
import { GEN, MANAGERS, NURTURE, SOURCES, STEP, sourceProfile, type SourceProfile } from "./config.ts";
import { PRODUCTS, productById } from "./catalog.ts";

export interface GenerateOptions {
  seed?: number;
  /** Последний день истории (по Москве) */
  endDate: ISODate;
  /** Текущий момент: события позже не создаются. По умолчанию — конец endDate */
  now?: number;
}

export const DEFAULT_SEED = 20261116;
const MIN = 60_000;

const FIRST_NAMES = [
  "Анна", "Мария", "Екатерина", "Ольга", "Наталья", "Елена", "Татьяна", "Ирина", "Светлана", "Юлия",
  "Анастасия", "Дарья", "Ксения", "Алина", "Виктория", "Полина", "Вероника", "Марина", "Кристина", "Евгения",
  "Александра", "Валерия", "Софья", "Людмила", "Надежда", "Оксана", "Яна", "Диана", "Алёна", "Карина",
];
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n",
  о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};
const translit = (s: string) => [...s.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join("");

/** Активность по часам (МСК): ночью тихо, пики в обед и вечером */
const HOUR_WEIGHTS = [2, 1, 0.6, 0.4, 0.4, 0.6, 1.5, 3, 4, 4.5, 5, 5.5, 6.5, 6.5, 5.5, 5, 5, 5.5, 6.5, 8, 9, 9, 7, 4];
const HOURS = HOUR_WEIGHTS.map((w, h) => ({ h, w }));

const LEGACY_SOURCE_WEIGHT: Partial<Record<SourceId, number>> = { organic: 0.4, referral: 0.25, tg_seeding: 0.2, yandex_direct: 0.15 };
const QUIZ_TYPES = ["стресс", "отёки", "гормоны", "режим"] as const;
const LOST_REASONS = ["Нет времени", "Дорого", "Не отвечает", "Выбрала другое", "Отложила на потом"];

export function generateDataset(opts: GenerateOptions): Dataset {
  const seed = opts.seed ?? DEFAULT_SEED;
  const rng = createRng(seed);
  const endDate = opts.endDate;
  const startDate = addDays(endDate, -(GEN.days - 1));
  const now = opts.now ?? mskDayStart(endDate) + DAY_MS - 1;

  const seq = new Map<string, number>();
  const nextId = (prefix: string) => {
    const n = (seq.get(prefix) ?? 0) + 1;
    seq.set(prefix, n);
    return `${prefix}-${String(n).padStart(5, "0")}`;
  };

  // ── Кампании и объявления ────────────────────────────────
  const campaigns: Campaign[] = [];
  const ads: Ad[] = [];
  const campaignWindow = new Map<ID, { from: number; to: number }>();
  const campaignsBySource = new Map<SourceId, Campaign[]>();
  const adsByCampaign = new Map<ID, Ad[]>();

  for (const sp of SOURCES) {
    const n = sp.campaigns.length;
    const list: Campaign[] = [];
    sp.campaigns.forEach((c, k) => {
      const always = !sp.source.isPaid;
      const from = always ? 0 : Math.max(0, Math.round((k * GEN.days) / n) - 20);
      const to = always || k === n - 1 ? GEN.days - 1 : Math.min(GEN.days - 1, Math.round(((k + 1) * GEN.days) / n) + 20);
      const camp: Campaign = {
        id: nextId("cmp"),
        sourceId: sp.source.id,
        name: c.name,
        utmCampaign: c.utm,
        startDate: addDays(startDate, from),
        endDate: to === GEN.days - 1 ? null : addDays(startDate, to),
      };
      campaigns.push(camp);
      list.push(camp);
      campaignWindow.set(camp.id, { from, to });
      const campAds = c.ads.map<Ad>((name, i) => ({ id: nextId("ad"), campaignId: camp.id, name, utmContent: `${c.utm}_${i + 1}` }));
      ads.push(...campAds);
      adsByCampaign.set(camp.id, campAds);
    });
    campaignsBySource.set(sp.source.id, list);
  }

  // ── Таблицы ──────────────────────────────────────────────
  const touchpoints: Touchpoint[] = [];
  const users: User[] = [];
  const events: AppEvent[] = [];
  const leads: Lead[] = [];
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const deliveries: NurtureDelivery[] = [];
  const nurtureBySeries = new Map<StallStep, NurtureMessage[]>();
  for (const m of NURTURE) nurtureBySeries.set(m.stallStep, [...(nurtureBySeries.get(m.stallStep) ?? []), m].sort((a, b) => a.order - b.order));

  const userQuizType = new Map<ID, string>();
  const payingUsers: ID[] = [];

  const pickTime = (day: number) => {
    const { h } = rng.weighted(HOURS, (x) => x.w);
    return mskDayStart(addDays(startDate, day)) + h * 60 * MIN + rng.int(0, 59) * MIN + rng.int(0, 59) * 1000;
  };

  const sourceWeight = (sp: SourceProfile, t: number) => {
    // Посевы и Telegram Ads растут к концу периода, VK — постепенно урезают
    if (sp.source.id === "tg_seeding") return sp.share * (0.7 + 0.6 * t);
    if (sp.source.id === "tg_ads") return sp.share * (0.85 + 0.3 * t);
    if (sp.source.id === "vk_ads") return sp.share * (1.15 - 0.3 * t);
    return sp.share;
  };

  const makeTouch = (visitorId: ID, sp: SourceProfile, at: number, day: number): Touchpoint => {
    const all = campaignsBySource.get(sp.source.id)!;
    const active = all.filter((c) => {
      const w = campaignWindow.get(c.id)!;
      return day >= w.from && day <= w.to;
    });
    const camp = rng.pick(active.length ? active : all);
    const ad = rng.pick(adsByCampaign.get(camp.id)!);
    return {
      id: nextId("tp"),
      visitorId,
      userId: null,
      at: toIso(at),
      sourceId: sp.source.id,
      campaignId: camp.id,
      adId: ad.id,
      utm: { source: sp.utmSource, medium: sp.utmMedium, campaign: camp.utmCampaign, content: ad.utmContent, term: null },
    };
  };

  const pushEvent = (e: Omit<AppEvent, "id"> & Pick<AppEvent, "type">) => {
    events.push({ ...e, id: nextId("ev") } as AppEvent);
  };

  /**
   * Переход со шага остановки на следующий. Без дожима — с вероятностью natural × mult,
   * иначе серия дожимных постов. Возвращает момент перехода или null (клиент остановился).
   */
  const advance = (user: User, step: StallStep, stalledAt: number, mult: number): { at: number; via: ID | null } | null => {
    const p = STEP[step];
    if (rng.chance(Math.min(0.97, p.natural * mult))) {
      const at = stalledAt + rng.lognormal(p.medianMin, p.spread) * MIN;
      return at <= now ? { at, via: null } : null;
    }
    for (const msg of nurtureBySeries.get(step) ?? []) {
      const sentAt = stalledAt + msg.delayMinutes * MIN + rng.int(0, 10) * MIN;
      if (sentAt > now || user.botBlockedAt) return null;
      const d: NurtureDelivery = { id: nextId("nd"), messageId: msg.id, userId: user.id, sentAt: toIso(sentAt), status: "sent", clickedAt: null, convertedAt: null };
      deliveries.push(d);
      if (rng.chance(GEN.blockPerMessage)) {
        d.status = "blocked";
        user.botBlockedAt = toIso(sentAt + rng.int(1, 120) * MIN);
        pushEvent({ userId: user.id, at: user.botBlockedAt, type: "bot_blocked", payload: {} });
        return null;
      }
      if (rng.chance(0.01)) {
        d.status = "failed";
        continue;
      }
      if (rng.chance(p.nurtureClick)) {
        const clickedAt = sentAt + rng.lognormal(25, 4) * MIN;
        if (clickedAt > now) return null;
        d.clickedAt = toIso(clickedAt);
        pushEvent({ userId: user.id, at: d.clickedAt, type: "nurture_clicked", payload: { deliveryId: d.id } });
        if (rng.chance(Math.min(0.95, p.nurtureConvert * mult))) {
          const at = clickedAt + rng.lognormal(12, 3) * MIN;
          if (at > now) return null;
          d.convertedAt = toIso(at);
          return { at, via: msg.id };
        }
      } else if (rng.chance(0.03)) {
        // Вернулась сама после поста, без клика по кнопке
        const at = sentAt + rng.lognormal(6 * 60, 3) * MIN;
        if (at > now) return null;
        d.convertedAt = toIso(at);
        return { at, via: msg.id };
      }
    }
    return null;
  };

  const productWeights = (premium: number): { p: Product; w: number }[] =>
    PRODUCTS.filter((p) => p.category !== "lead_magnet").map((p) => {
      const base: Record<string, number> = {
        "guide-desserts": 0.035, "guide-pelvic": 0.03, "guide-posture": 0.03, "guide-cellulite": 0.03, "guide-cortisol": 0.03, "guide-menu14": 0.04,
        "marathon-edema": 0.16, club: 0.2, "course-abs": 0.05, "course-dry": 0.04, "course-postpartum": 0.05, "course-hormones": 0.04,
        group: 0.3, personal: 0.05,
      };
      const w = (base[p.id] ?? 0) * (p.id === "personal" ? premium : p.category === "tripwire" ? 1 / premium : 1);
      return { p, w };
    });

  const PLAN_WEIGHTS: Record<string, number[]> = { group: [0.45, 0.25, 0.3], personal: [0.3, 0.24, 0.3, 0.1, 0.06] };

  const pickManager = () => rng.weighted(MANAGERS, (m) => (m.id === "m-maria" ? 0.38 : m.id === "m-olga" ? 0.37 : 0.25));

  /** Создать заказ и, если оплачен, оплаты (с рассрочкой, подпиской, возвратом) */
  const placeOrder = (user: User, lead: Lead | null, sp: SourceProfile, createdAt: number, isRepeat: boolean, exclude: ID[]): { paidAt: number | null; refunded: boolean; order: Order } => {
    const options = productWeights(sp.premium).filter((x) => !exclude.includes(x.p.id));
    const product = rng.weighted(options, (x) => x.w).p;
    const plan = PLAN_WEIGHTS[product.id] ? product.plans[pickIndex(rng, PLAN_WEIGHTS[product.id]!)]! : product.plans[0]!;
    const needsManager = product.category === "course" || product.category === "mentorship";
    const manager = needsManager ? (lead?.managerId ? MANAGERS.find((m) => m.id === lead.managerId)! : pickManager()) : null;
    if (lead && manager && !lead.managerId) lead.managerId = manager.id;
    if (manager && !user.managerId) user.managerId = manager.id;

    const discountable = product.category === "course" || product.category === "mentorship";
    const discountRub = discountable && rng.chance(GEN.petalsDiscountShare) ? Math.floor((plan.priceRub * rng.float(0.05, 0.2)) / 10) * 10 : 0;
    const amount = plan.priceRub - discountRub;
    const installmentMonths = plan.installmentMonths && rng.chance(GEN.installmentShare) ? plan.installmentMonths : null;

    const order: Order = {
      id: nextId("ord"),
      userId: user.id,
      leadId: lead?.id ?? null,
      productId: product.id,
      planId: plan.id,
      managerId: manager?.id ?? null,
      createdAt: toIso(createdAt),
      listPrice: plan.priceRub,
      discountRub,
      amount,
      status: "created",
      installmentMonths,
      isRepeat,
    };
    orders.push(order);
    pushEvent({ userId: user.id, at: order.createdAt, type: "checkout_opened", payload: { orderId: order.id } });

    let paid: { at: number } | null;
    if (isRepeat) {
      paid = rng.chance(0.78) ? { at: createdAt + rng.lognormal(20, 4) * MIN } : null;
      if (paid && paid.at > now) paid = null;
    } else {
      paid = advance(user, "order", createdAt, manager?.closeRate ?? 1);
    }
    if (!paid) {
      order.status = now - createdAt > 3 * DAY_MS ? "cancelled" : "created";
      return { paidAt: null, refunded: false, order };
    }

    const provider = product.category === "tripwire" && rng.chance(0.3) ? "telegram_stars" : "yookassa";
    // Возвращают в основном недорогие продукты; личное сопровождение — почти никогда
    const refundP = product.category === "mentorship" ? GEN.refundRate * 0.1 : GEN.refundRate * 1.15;
    const refundAt = rng.chance(refundP) ? paid.at + Math.min(14 * DAY_MS, rng.lognormal(4, 2) * DAY_MS) : null;
    let paidSum = 0;
    let refunded = false;

    const pay = (at: number, sum: number, kind: Payment["kind"], installmentNo: number | null) => {
      payments.push({ id: nextId("pay"), orderId: order.id, userId: user.id, at: toIso(at), amount: sum, kind, installmentNo, provider });
      paidSum += sum;
    };

    if (installmentMonths) {
      const part = Math.floor(amount / installmentMonths);
      for (let i = 0; i < installmentMonths; i++) {
        const at = paid.at + i * 30 * DAY_MS;
        if (at > now || (refundAt && at > refundAt)) break;
        pay(at, i === installmentMonths - 1 ? amount - part * (installmentMonths - 1) : part, "installment", i + 1);
      }
      order.status = paidSum >= amount ? "paid" : "installment";
    } else {
      pay(paid.at, amount, "full", null);
      order.status = "paid";
      if (product.id === "club" && !refundAt) {
        // Подписка: продление каждый месяц, пока не ушла
        for (let m = 1; m < GEN.clubMaxMonths; m++) {
          const at = paid.at + m * 30 * DAY_MS;
          if (at > now || rng.chance(GEN.clubChurn)) break;
          pay(at, amount, "subscription", null);
        }
      }
    }

    if (refundAt && refundAt <= now) {
      payments.push({ id: nextId("pay"), orderId: order.id, userId: user.id, at: toIso(refundAt), amount: -paidSum, kind: "refund", installmentNo: null, provider });
      order.status = "refunded";
      refunded = true;
    }
    return { paidAt: paid.at, refunded, order };
  };

  // ── Клиентки, пришедшие до начала периода ───────────────
  // Школа работала и раньше: участницы клуба продлевают подписку, а купившие личное
  // сопровождение доплачивают рассрочку. Это даёт регулярную выручку с первого дня периода.
  const windowStart = mskDayStart(startDate);
  for (let i = 0; i < GEN.legacyClub + GEN.legacyInstallments; i++) {
    const isClub = i < GEN.legacyClub;
    const sp = rng.weighted(SOURCES.filter((s) => ["organic", "referral", "tg_seeding", "yandex_direct"].includes(s.source.id)), (s) => LEGACY_SOURCE_WEIGHT[s.source.id] ?? 0);
    // Для подписки — давно, для рассрочки — за 1–3 месяца до начала периода
    // Даты продлений клуба равномерно распределены по 30-дневному циклу — выручка от подписки идёт каждый день
    const startAt = windowStart - (isClub ? (i % 30) + 30 * rng.int(1, 8) + 4 : rng.int(15, 85)) * DAY_MS - rng.int(0, 23) * 60 * MIN;
    const visitorId = nextId("v");
    const tp = makeTouch(visitorId, sp, startAt - rng.int(5, 90) * MIN, 0);
    const firstName = rng.pick(FIRST_NAMES);
    const user: User = {
      id: nextId("u"),
      tgUserId: 5_100_000_000 + users.length * 7_919 + rng.int(0, 7_000),
      firstName,
      username: rng.chance(0.55) ? `${translit(firstName)}_${rng.int(10, 9999)}` : null,
      createdAt: toIso(startAt),
      managerId: null,
      referrerId: null,
      tags: ["с прошлого сезона"],
      botBlockedAt: null,
    };
    tp.userId = user.id;
    touchpoints.push(tp);
    users.push(user);
    pushEvent({ userId: user.id, at: user.createdAt, type: "bot_start", payload: { startParam: sp.utmSource } });
    pushEvent({ userId: user.id, at: toIso(startAt + 4 * MIN), type: "webapp_open", payload: { startParam: null, platform: "ios" } });
    pushEvent({ userId: user.id, at: toIso(startAt + 6 * MIN), type: "onboarded", payload: {} });
    for (const n of [1, 2, 3] as const) pushEvent({ userId: user.id, at: toIso(startAt + n * DAY_MS), type: "lesson_completed", payload: { lesson: n } });
    const lead: Lead = { id: nextId("lead"), userId: user.id, createdAt: toIso(startAt + 6 * MIN), status: "won", managerId: null, lostReason: null };
    leads.push(lead);
    payingUsers.push(user.id);

    const orderAt = startAt + 4 * DAY_MS;
    const product = productById.get(isClub ? "club" : "personal")!;
    const plan = isClub ? product.plans[0]! : rng.chance(0.6) ? product.plans[4]! : product.plans[3]!;
    const manager = isClub ? null : pickManager();
    if (manager) lead.managerId = user.managerId = manager.id;
    const months = plan.installmentMonths ?? 1;
    const order: Order = {
      id: nextId("ord"), userId: user.id, leadId: lead.id, productId: product.id, planId: plan.id, managerId: manager?.id ?? null,
      createdAt: toIso(orderAt), listPrice: plan.priceRub, discountRub: 0, amount: plan.priceRub, status: "paid",
      installmentMonths: isClub ? null : months, isRepeat: false,
    };
    orders.push(order);
    pushEvent({ userId: user.id, at: order.createdAt, type: "checkout_opened", payload: { orderId: order.id } });
    const payAt = orderAt + 20 * MIN;
    if (isClub) {
      payments.push({ id: nextId("pay"), orderId: order.id, userId: user.id, at: toIso(payAt), amount: plan.priceRub, kind: "full", installmentNo: null, provider: "yookassa" });
      for (let m = 1; ; m++) {
        const at = payAt + m * 30 * DAY_MS;
        if (at > now || (at > windowStart && rng.chance(GEN.legacyClubChurn))) break;
        payments.push({ id: nextId("pay"), orderId: order.id, userId: user.id, at: toIso(at), amount: plan.priceRub, kind: "subscription", installmentNo: null, provider: "yookassa" });
      }
    } else {
      const part = Math.floor(plan.priceRub / months);
      let paidSum = 0;
      for (let k = 0; k < months; k++) {
        const at = payAt + k * 30 * DAY_MS;
        if (at > now) break;
        const sum = k === months - 1 ? plan.priceRub - part * (months - 1) : part;
        paidSum += sum;
        payments.push({ id: nextId("pay"), orderId: order.id, userId: user.id, at: toIso(at), amount: sum, kind: "installment", installmentNo: k + 1, provider: "yookassa" });
      }
      order.status = paidSum >= plan.priceRub ? "paid" : "installment";
    }
  }

  // ── Визиты и путь клиента ────────────────────────────────
  for (let day = 0; day < GEN.days; day++) {
    const t = day / (GEN.days - 1);
    const dayDate = addDays(startDate, day);
    const growth = GEN.growthFrom + (GEN.growthTo - GEN.growthFrom) * t;
    const visitors = Math.round(GEN.visitorsPerDay * growth * GEN.weekday[mskWeekday(dayDate)]! * rng.float(0.93, 1.07));

    for (let v = 0; v < visitors; v++) {
      const visitorId = nextId("v");
      const firstAt = pickTime(day);
      if (firstAt > now) continue;
      let sp = rng.weighted(SOURCES, (s) => sourceWeight(s, t));
      const path: Touchpoint[] = [makeTouch(visitorId, sp, firstAt, day)];

      // 20% визитёров приходят повторно (до 3 касаний) — разница между моделями атрибуции
      const extra = rng.chance(0.2) ? (rng.chance(0.25) ? 2 : 1) : 0;
      let lastAt = firstAt;
      for (let k = 0; k < extra; k++) {
        const at = lastAt + rng.lognormal(1.5, 2.5) * DAY_MS;
        const d = Math.floor((at - mskDayStart(startDate)) / DAY_MS);
        if (at > now || d >= GEN.days) break;
        sp = rng.chance(0.5) ? sp : rng.weighted(SOURCES, (s) => sourceWeight(s, t));
        path.push(makeTouch(visitorId, sp, at, d));
        lastAt = at;
      }
      touchpoints.push(...path);

      // Старт бота — качество трафика последнего касания
      const lastSp = sp;
      if (!rng.chance(GEN.botStart * lastSp.startQuality)) continue;
      const startAt = lastAt + rng.lognormal(4, 3) * MIN;
      if (startAt > now) continue;

      const firstName = rng.pick(FIRST_NAMES);
      const user: User = {
        id: nextId("u"),
        tgUserId: 5_100_000_000 + users.length * 7_919 + rng.int(0, 7_000),
        firstName,
        username: rng.chance(0.55) ? `${translit(firstName)}_${rng.int(10, 9999)}` : null,
        createdAt: toIso(startAt),
        managerId: null,
        referrerId: lastSp.source.id === "referral" && payingUsers.length ? rng.pick(payingUsers) : null,
        tags: [],
        botBlockedAt: null,
      };
      users.push(user);
      for (const tp of path) tp.userId = user.id;
      if (rng.chance(0.3)) user.tags.push("мама");
      if (rng.chance(0.15)) user.tags.push("40+");
      pushEvent({ userId: user.id, at: user.createdAt, type: "bot_start", payload: { startParam: lastSp.source.id === "referral" ? `ref_${user.referrerId ?? "link"}` : lastSp.utmSource } });

      const platform = rng.weighted<Platform>(["ios", "android", "tdesktop", "web"], (p) => ({ ios: 0.45, android: 0.42, tdesktop: 0.1, web: 0.03 })[p]);

      // bot_start → webapp_open
      const open = advance(user, "bot_start", startAt, 1);
      if (!open) continue;
      pushEvent({ userId: user.id, at: toIso(open.at), type: "webapp_open", payload: { startParam: open.via ? `nurture_${open.via}` : null, platform } });

      // webapp_open → лид (прошла приветствие)
      const onb = advance(user, "webapp_open", open.at, 1);
      if (!onb) continue;
      pushEvent({ userId: user.id, at: toIso(onb.at), type: "onboarded", payload: {} });
      const lead: Lead = { id: nextId("lead"), userId: user.id, createdAt: toIso(onb.at), status: "new", managerId: null, lostReason: null };
      leads.push(lead);
      let lastActivity = onb.at;

      if (rng.chance(GEN.quizShare)) {
        const at = onb.at + rng.lognormal(2 * 60, 4) * MIN;
        if (at <= now) {
          const result = rng.pick(QUIZ_TYPES);
          userQuizType.set(user.id, result);
          user.tags.push(`тип: ${result}`);
          pushEvent({ userId: user.id, at: toIso(at), type: "quiz_completed", payload: { quiz: "type", result } });
        }
      }

      // Уроки 1–3
      let stalledAt = onb.at;
      let reached = 0;
      const lessonSteps: StallStep[] = ["lead", "lesson_1", "lesson_2"];
      for (let i = 0; i < 3; i++) {
        const next = advance(user, lessonSteps[i]!, stalledAt, 1);
        if (!next) break;
        reached = i + 1;
        stalledAt = next.at;
        lastActivity = next.at;
        pushEvent({ userId: user.id, at: toIso(next.at), type: "lesson_completed", payload: { lesson: (i + 1) as 1 | 2 | 3 } });
      }
      lead.status = reached > 0 ? "warming" : "new";

      if (reached === 3) {
        lead.status = "offer_sent";
        if (rng.chance(0.4)) lead.managerId = pickManager().id;
        if (rng.chance(0.3)) {
          const at = stalledAt + rng.lognormal(3 * 60, 3) * MIN;
          if (at <= now) pushEvent({ userId: user.id, at: toIso(at), type: "guide_unlocked", payload: { productId: rng.pick(["guide-desserts", "guide-pelvic", "guide-posture"]), paidWith: "petals" } });
        }

        // урок 3 → заказ (качество источника)
        const buyGrowth = GEN.buyGrowthFrom + (GEN.buyGrowthTo - GEN.buyGrowthFrom) * t;
        const ord = advance(user, "lesson_3", stalledAt, lastSp.buyQuality * buyGrowth);
        if (ord) {
          lastActivity = ord.at;
          const first = placeOrder(user, lead, lastSp, ord.at, false, []);
          if (first.paidAt && !first.refunded) {
            lead.status = "won";
            payingUsers.push(user.id);
            lastActivity = first.paidAt;
            // Повторная покупка (апсейл)
            if (rng.chance(GEN.repeatPurchase * lastSp.buyQuality)) {
              const at = first.paidAt + rng.lognormal(25, 1.8) * DAY_MS;
              if (at <= now) placeOrder(user, lead, lastSp, at, true, [first.order.productId, "free-lessons"]);
            }
          }
        }
      }

      if (lead.status !== "won" && now - lastActivity > 14 * DAY_MS) {
        lead.status = "lost";
        lead.lostReason = rng.pick(LOST_REASONS);
      }
    }
  }

  // ── Теги по покупкам ─────────────────────────────────────
  const ltvByUser = new Map<ID, number>();
  for (const p of payments) ltvByUser.set(p.userId, (ltvByUser.get(p.userId) ?? 0) + p.amount);
  const productsByUser = new Map<ID, Set<ID>>();
  for (const o of orders) if (o.status !== "created" && o.status !== "cancelled") productsByUser.set(o.userId, (productsByUser.get(o.userId) ?? new Set()).add(o.productId));
  for (const u of users) {
    const bought = productsByUser.get(u.id);
    if (bought?.has("club")) u.tags.push("клуб");
    if (bought?.has("personal")) u.tags.push("1:1");
    if ((ltvByUser.get(u.id) ?? 0) >= 20_000) u.tags.push("VIP");
  }

  // ── Расходы: клики платных источников по дням и объявлениям ──
  const adSource = new Map<ID, SourceProfile>();
  for (const ad of ads) adSource.set(ad.id, sourceProfile(campaigns.find((c) => c.id === ad.campaignId)!.sourceId));
  const clicks = new Map<string, number>();
  for (const tp of touchpoints) {
    // Расходы — только за период отчёта (касания клиенток прошлого сезона были раньше)
    if (!tp.adId || !adSource.get(tp.adId)!.source.isPaid || mskDay(tp.at) < startDate) continue;
    const key = `${mskDay(tp.at)}|${tp.adId}`;
    clicks.set(key, (clicks.get(key) ?? 0) + 1);
  }
  const adCosts: AdCost[] = [...clicks.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, c]) => {
      const [date, adId] = key.split("|") as [ISODate, ID];
      const sp = adSource.get(adId)!;
      return {
        date,
        adId,
        clicks: c,
        impressions: Math.max(c, Math.round(c / (sp.ctr * rng.float(0.8, 1.2)))),
        spend: Math.round(c * sp.cpc * rng.float(0.85, 1.15)),
      };
    });

  // ── План: факт прошлого месяца +15% ──────────────────────
  const plans = buildPlans(payments, leads, orders, startDate, endDate);

  const byAt = <T extends { at: string }>(a: T, b: T) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);
  touchpoints.sort(byAt);
  events.sort(byAt);
  payments.sort(byAt);
  orders.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  leads.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  deliveries.sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));

  return {
    generatedFor: { seed, startDate, endDate },
    sources: SOURCES.map((s) => s.source),
    campaigns,
    ads,
    adCosts,
    users,
    touchpoints,
    events,
    leads,
    products: PRODUCTS,
    orders,
    payments,
    managers: MANAGERS.map(({ closeRate: _closeRate, ...m }) => m),
    nurtureMessages: NURTURE,
    nurtureDeliveries: deliveries,
    plans,
  };
}

function pickIndex(rng: Rng, weights: number[]): number {
  return rng.weighted(weights.map((w, i) => ({ w, i })), (x) => x.w).i;
}

/**
 * План на месяц = темп прошлого месяца (в день) × дней в месяце × 1,08.
 * Для первого месяца берётся его собственный темп × 1,05.
 */
function buildPlans(payments: Payment[], leads: Lead[], orders: Order[], startDate: ISODate, endDate: ISODate): PlanTarget[] {
  const daysIn = new Map<string, number>();
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) daysIn.set(mskMonth(d), (daysIn.get(mskMonth(d)) ?? 0) + 1);
  const months = [...daysIn.keys()];
  const fullDays = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
  const firstPaid = new Set(payments.filter((p) => p.kind === "full" || (p.kind === "installment" && p.installmentNo === 1)).map((p) => p.orderId));
  // Только даты периода отчёта: платежи клиенток прошлого сезона до его начала не в счёт
  const inWindow = (iso: string) => mskDay(iso) >= startDate;
  const fact = (m: string) => ({
    revenue: payments.filter((p) => mskMonth(p.at) === m && inWindow(p.at)).reduce((s, p) => s + p.amount, 0),
    leads: leads.filter((l) => mskMonth(l.createdAt) === m && inWindow(l.createdAt)).length,
    sales: orders.filter((o) => firstPaid.has(o.id) && o.status !== "refunded" && mskMonth(o.createdAt) === m && inWindow(o.createdAt)).length,
  });
  const plans: PlanTarget[] = [];
  months.forEach((m, i) => {
    const baseMonth = months[Math.max(0, i - 1)]!;
    const base = fact(baseMonth);
    // Первый месяц периода неполный — план только на его дни
    const days = i === 0 ? daysIn.get(m)! : fullDays(m);
    const scale = (days / daysIn.get(baseMonth)!) * (i === 0 ? 1.0 : 1.08);
    plans.push(
      { month: m, metric: "revenue", value: Math.round((base.revenue * scale) / 1000) * 1000 },
      { month: m, metric: "leads", value: Math.round(base.leads * scale) },
      { month: m, metric: "sales", value: Math.round(base.sales * scale) },
    );
  });
  return plans;
}

/** productById реэкспортируется для MockDataSource */
export { productById };
