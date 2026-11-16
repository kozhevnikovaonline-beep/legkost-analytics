/**
 * Типы домена админки «Онлайн-школа Алёны Ветровой».
 * Это контракт между генератором моков, будущим бэкендом (таблицы PostgreSQL в README) и UI.
 */

export type ID = string;
/** Момент времени в ISO 8601 (UTC). В интерфейсе показывается в Europe/Moscow */
export type ISODateTime = string;
/** Календарный день в Europe/Moscow, YYYY-MM-DD */
export type ISODate = string;
/** Рубли, целое число */
export type Rub = number;

// ── Маркетинг ──────────────────────────────────────────────
export type SourceId = "yandex_direct" | "vk_ads" | "tg_ads" | "tg_seeding" | "organic" | "referral";

export interface Source {
  id: SourceId;
  name: string;
  /** Органика и рефералы — без рекламного расхода */
  isPaid: boolean;
}

export interface Campaign {
  id: ID;
  sourceId: SourceId;
  name: string;
  utmCampaign: string;
  startDate: ISODate;
  endDate: ISODate | null;
}

export interface Ad {
  id: ID;
  campaignId: ID;
  /** Объявление / креатив / пост в канале */
  name: string;
  utmContent: string;
}

/** Расход по объявлению за день (выгрузка из рекламных кабинетов) */
export interface AdCost {
  date: ISODate;
  adId: ID;
  impressions: number;
  clicks: number;
  spend: Rub;
}

// ── Пользователи и касания ─────────────────────────────────
export interface User {
  id: ID;
  tgUserId: number;
  firstName: string;
  username: string | null;
  /** Первый старт бота */
  createdAt: ISODateTime;
  managerId: ID | null;
  /** Кто пригласил (реферальная программа приложения) */
  referrerId: ID | null;
  tags: string[];
  botBlockedAt: ISODateTime | null;
}

export interface Utm {
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  term: string | null;
}

/** Касание: клик по рекламе / переход из поста / органика / реферальная ссылка */
export interface Touchpoint {
  id: ID;
  /** До старта бота пользователь анонимен */
  visitorId: ID;
  /** Проставляется после старта бота */
  userId: ID | null;
  at: ISODateTime;
  sourceId: SourceId;
  campaignId: ID | null;
  adId: ID | null;
  utm: Utm;
}

// ── События воронки и приложения ───────────────────────────
export type FunnelStep =
  | "click"
  | "bot_start"
  | "webapp_open"
  | "lead"
  | "lesson_1"
  | "lesson_2"
  | "lesson_3"
  | "order"
  | "payment"
  | "repeat_payment";

export const FUNNEL_STEPS: readonly FunnelStep[] = [
  "click",
  "bot_start",
  "webapp_open",
  "lead",
  "lesson_1",
  "lesson_2",
  "lesson_3",
  "order",
  "payment",
  "repeat_payment",
];

interface EventBase<T extends string, P> {
  id: ID;
  userId: ID;
  at: ISODateTime;
  type: T;
  payload: P;
}

export type Platform = "ios" | "android" | "tdesktop" | "web";

/** События с типизированной нагрузкой (дискриминированное объединение) */
export type AppEvent =
  | EventBase<"bot_start", { startParam: string | null }>
  | EventBase<"webapp_open", { startParam: string | null; platform: Platform }>
  /** Прошла приветствие = лид */
  | EventBase<"onboarded", Record<string, never>>
  | EventBase<"lesson_completed", { lesson: 1 | 2 | 3 }>
  | EventBase<"quiz_completed", { quiz: "type" | "format"; result: string }>
  | EventBase<"guide_unlocked", { productId: ID; paidWith: "petals" | "rub" }>
  | EventBase<"checkout_opened", { orderId: ID }>
  | EventBase<"nurture_clicked", { deliveryId: ID }>
  | EventBase<"bot_blocked", Record<string, never>>;

export type AppEventType = AppEvent["type"];

// ── Лиды, продукты, заказы, оплаты ─────────────────────────
export type LeadStatus = "new" | "warming" | "offer_sent" | "won" | "lost";

export interface Lead {
  id: ID;
  userId: ID;
  createdAt: ISODateTime;
  status: LeadStatus;
  managerId: ID | null;
  lostReason: string | null;
}

export type ProductCategory = "lead_magnet" | "tripwire" | "subscription" | "course" | "mentorship";

export interface PricePlan {
  /** "1m", "3m", "base" — как в приложении */
  id: ID;
  label: string;
  priceRub: Rub;
  /** Доступна рассрочка на N месяцев */
  installmentMonths: number | null;
}

export interface Product {
  /** Как в приложении: "group", "personal", "guide-menu14"… */
  id: ID;
  name: string;
  category: ProductCategory;
  plans: PricePlan[];
}

export type OrderStatus = "created" | "paid" | "installment" | "refunded" | "cancelled";

export interface Order {
  id: ID;
  userId: ID;
  leadId: ID | null;
  productId: ID;
  planId: ID;
  managerId: ID | null;
  createdAt: ISODateTime;
  listPrice: Rub;
  /** Скидка лепестками (до 20% цены курса или формата) */
  discountRub: Rub;
  /** К оплате = listPrice − discountRub */
  amount: Rub;
  status: OrderStatus;
  installmentMonths: number | null;
  /** Повторная покупка клиента */
  isRepeat: boolean;
}

export type PaymentKind = "full" | "installment" | "subscription" | "refund";

export interface Payment {
  id: ID;
  orderId: ID;
  userId: ID;
  at: ISODateTime;
  /** Возврат — отрицательная сумма */
  amount: Rub;
  kind: PaymentKind;
  installmentNo: number | null;
  provider: "yookassa" | "telegram_stars";
}

export interface Manager {
  id: ID;
  name: string;
  role: "curator" | "sales";
  monthlyPlanRub: Rub;
}

// ── Дожимные посты бота ────────────────────────────────────
/** Шаг воронки, на котором клиент остановился и для которого пишется дожим */
export type StallStep = Exclude<FunnelStep, "click" | "payment" | "repeat_payment">;

export interface NurtureMessage {
  id: ID;
  stallStep: StallStep;
  /** 1-й, 2-й, 3-й пост серии */
  order: number;
  /** Через сколько после остановки */
  delayMinutes: number;
  title: string;
  cta: "open_app" | "lesson" | "offer" | "pay" | "reviews";
}

export interface NurtureDelivery {
  id: ID;
  messageId: ID;
  userId: ID;
  sentAt: ISODateTime;
  status: "sent" | "failed" | "blocked";
  /** Нажала кнопку поста */
  clickedAt: ISODateTime | null;
  /** Дошла до следующего шага ≤ 72 ч после поста */
  convertedAt: ISODateTime | null;
}

// ── План ───────────────────────────────────────────────────
export type PlanMetric = "revenue" | "leads" | "sales";

export interface PlanTarget {
  /** "2026-11" */
  month: string;
  metric: PlanMetric;
  value: number;
}

/** Все таблицы, которые отдаёт генератор (и в будущем — БД) */
export interface Dataset {
  generatedFor: { seed: number; startDate: ISODate; endDate: ISODate };
  sources: Source[];
  campaigns: Campaign[];
  ads: Ad[];
  adCosts: AdCost[];
  users: User[];
  touchpoints: Touchpoint[];
  events: AppEvent[];
  leads: Lead[];
  products: Product[];
  orders: Order[];
  payments: Payment[];
  managers: Manager[];
  nurtureMessages: NurtureMessage[];
  nurtureDeliveries: NurtureDelivery[];
  plans: PlanTarget[];
}
