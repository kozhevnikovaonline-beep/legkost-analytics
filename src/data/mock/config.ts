/**
 * Параметры генератора: источники трафика с реалистичными CTR/CPC/конверсиями,
 * менеджеры, сценарий дожимных постов бота, вероятности шагов воронки.
 * Меняя эти числа, можно «покрутить» экономику демо без правки кода генератора.
 */
import type { Manager, NurtureMessage, Source, SourceId, StallStep } from "../../types/domain.ts";

export interface SourceProfile {
  source: Source;
  /** Доля визитов источника */
  share: number;
  ctr: number;
  /** Средняя цена клика, ₽ */
  cpc: number;
  /** Множитель вероятности старта бота (качество трафика на входе) */
  startQuality: number;
  /** Множитель конверсии в заказ (тёплость аудитории) */
  buyQuality: number;
  /** Склонность к дорогим форматам (1:1) */
  premium: number;
  utmSource: string;
  utmMedium: string;
  campaigns: { name: string; utm: string; ads: string[] }[];
}

export const SOURCES: SourceProfile[] = [
  {
    source: { id: "yandex_direct", name: "Яндекс Директ", isPaid: true },
    share: 0.23, ctr: 0.012, cpc: 46, startQuality: 1.0, buyQuality: 1.0, premium: 1.0,
    utmSource: "yandex", utmMedium: "cpc",
    campaigns: [
      { name: "Поиск · похудение без диет", utm: "search_bez_diet", ads: ["Минус 5 кг без голода", "3 урока бесплатно", "Худеть после родов"] },
      { name: "РСЯ · ретаргетинг", utm: "rsya_retarget", ads: ["Вернись к урокам", "Отзыв Ольги −6 кг"] },
      { name: "Мастер кампаний · уроки", utm: "master_lessons", ads: ["Видео: 7 причин", "Карусель: тарелка", "Баннер с Алёной"] },
    ],
  },
  {
    source: { id: "vk_ads", name: "VK Реклама", isPaid: true },
    share: 0.21, ctr: 0.006, cpc: 36, startQuality: 0.72, buyQuality: 0.4, premium: 0.6,
    utmSource: "vk", utmMedium: "cpc",
    campaigns: [
      { name: "Лид-форма · мамы 25–40", utm: "mamy_25_40", ads: ["Тело после родов", "20 минут дома"] },
      { name: "Клипы · тренировки", utm: "clips_workout", ads: ["Клип: планка", "Клип: живот", "Клип: тарелка"] },
      { name: "Широкая · женщины 30+", utm: "wide_30", ads: ["Без диет и зала", "Сладкое без срывов"] },
    ],
  },
  {
    source: { id: "tg_ads", name: "Telegram Ads", isPaid: true },
    share: 0.15, ctr: 0.018, cpc: 62, startQuality: 1.18, buyQuality: 1.1, premium: 1.15,
    utmSource: "telegram", utmMedium: "tgads",
    campaigns: [
      { name: "Каналы о ЗОЖ", utm: "zozh_channels", ads: ["Мини-курс в боте", "Лепестки за уроки"] },
      { name: "Каналы для мам", utm: "mama_channels", ads: ["После родов без диет", "Тренировка 20 минут"] },
    ],
  },
  {
    source: { id: "tg_seeding", name: "Посевы в TG-каналах", isPaid: true },
    share: 0.17, ctr: 0.025, cpc: 38, startQuality: 1.25, buyQuality: 1.35, premium: 1.3,
    utmSource: "telegram", utmMedium: "seeding",
    campaigns: [
      { name: "Посевы · фитнес-блогеры", utm: "fit_bloggers", ads: ["@fit_mama_life", "@zozh_kitchen", "@sport_dom"] },
      { name: "Посевы · психология", utm: "psy_channels", ads: ["@lubi_sebya", "@zhenskiy_klub"] },
      { name: "Посевы · рецепты", utm: "recipes", ads: ["@pp_recepty", "@vkusno_i_legko"] },
    ],
  },
  {
    source: { id: "organic", name: "Органика", isPaid: false },
    share: 0.16, ctr: 0, cpc: 0, startQuality: 1.05, buyQuality: 1.15, premium: 1.1,
    utmSource: "organic", utmMedium: "organic",
    campaigns: [
      { name: "Сайт и поиск", utm: "site", ads: ["Лендинг «Лёгкость»"] },
      { name: "Канал Алёны", utm: "channel", ads: ["Пост в канале", "Закреп в канале"] },
    ],
  },
  {
    source: { id: "referral", name: "Рефералы", isPaid: false },
    share: 0.08, ctr: 0, cpc: 0, startQuality: 1.4, buyQuality: 1.45, premium: 1.2,
    utmSource: "referral", utmMedium: "invite",
    campaigns: [{ name: "Приглашения подруг", utm: "invite_friend", ads: ["Ссылка из приложения"] }],
  },
];

export const sourceProfile = (id: SourceId): SourceProfile => SOURCES.find((s) => s.source.id === id)!;

export const MANAGERS: (Manager & { closeRate: number })[] = [
  { id: "m-maria", name: "Мария Соколова", role: "curator", monthlyPlanRub: 90_000, closeRate: 1.12 },
  { id: "m-olga", name: "Ольга Белова", role: "sales", monthlyPlanRub: 110_000, closeRate: 1.0 },
  { id: "m-daria", name: "Дарья Ким", role: "sales", monthlyPlanRub: 80_000, closeRate: 0.8 },
];

/** Сценарий дожимных постов: на каком шаге клиент остановился → серия постов */
export const NURTURE: NurtureMessage[] = [
  { id: "n-start-1", stallStep: "bot_start", order: 1, delayMinutes: 60, title: "Уроки уже ждут", cta: "open_app" },
  { id: "n-start-2", stallStep: "bot_start", order: 2, delayMinutes: 24 * 60, title: "Почему вес стоит — 7 причин", cta: "open_app" },
  { id: "n-open-1", stallStep: "webapp_open", order: 1, delayMinutes: 3 * 60, title: "Заберите подарок за старт", cta: "open_app" },
  { id: "n-open-2", stallStep: "webapp_open", order: 2, delayMinutes: 24 * 60, title: "Меню на 3 дня внутри", cta: "open_app" },
  { id: "n-lead-1", stallStep: "lead", order: 1, delayMinutes: 3 * 60, title: "Урок 1: 7 скрытых причин", cta: "lesson" },
  { id: "n-lead-2", stallStep: "lead", order: 2, delayMinutes: 24 * 60, title: "Ольга: −6 кг за 31 день", cta: "lesson" },
  { id: "n-l1-1", stallStep: "lesson_1", order: 1, delayMinutes: 24 * 60, title: "Тарелка без голода", cta: "lesson" },
  { id: "n-l1-2", stallStep: "lesson_1", order: 2, delayMinutes: 48 * 60, title: "Сладкое без срывов", cta: "lesson" },
  { id: "n-l2-1", stallStep: "lesson_2", order: 1, delayMinutes: 24 * 60, title: "Плоский живот за 20 минут", cta: "lesson" },
  { id: "n-l2-2", stallStep: "lesson_2", order: 2, delayMinutes: 48 * 60, title: "Остался один урок и бонус-эфир", cta: "lesson" },
  { id: "n-l3-1", stallStep: "lesson_3", order: 1, delayMinutes: 2 * 60, title: "Почему трёх уроков мало", cta: "offer" },
  { id: "n-l3-2", stallStep: "lesson_3", order: 2, delayMinutes: 24 * 60, title: "Отзывы выпускниц", cta: "reviews" },
  { id: "n-l3-3", stallStep: "lesson_3", order: 3, delayMinutes: 72 * 60, title: "Скидка лепестками сгорает", cta: "offer" },
  { id: "n-order-1", stallStep: "order", order: 1, delayMinutes: 30, title: "Место за вами", cta: "pay" },
  { id: "n-order-2", stallStep: "order", order: 2, delayMinutes: 24 * 60, title: "Помочь с оплатой?", cta: "pay" },
];

export interface StepProfile {
  /** Вероятность перейти на следующий шаг без дожима */
  natural: number;
  /** Медиана времени перехода, мин */
  medianMin: number;
  spread: number;
  /** Вероятность клика по дожимному посту */
  nurtureClick: number;
  /** Вероятность дойти до следующего шага после клика */
  nurtureConvert: number;
}

/** Переходы со шага «где остановилась» на следующий */
export const STEP: Record<StallStep, StepProfile> = {
  bot_start: { natural: 0.6, medianMin: 3, spread: 3, nurtureClick: 0.3, nurtureConvert: 0.6 },
  webapp_open: { natural: 0.72, medianMin: 2, spread: 2.5, nurtureClick: 0.28, nurtureConvert: 0.55 },
  lead: { natural: 0.6, medianMin: 40, spread: 4, nurtureClick: 0.3, nurtureConvert: 0.55 },
  lesson_1: { natural: 0.6, medianMin: 22 * 60, spread: 2.2, nurtureClick: 0.27, nurtureConvert: 0.55 },
  lesson_2: { natural: 0.65, medianMin: 24 * 60, spread: 2, nurtureClick: 0.27, nurtureConvert: 0.55 },
  /** урок 3 → заказ: умножается на качество источника */
  lesson_3: { natural: 0.22, medianMin: 26 * 60, spread: 3, nurtureClick: 0.22, nurtureConvert: 0.45 },
  /** заказ → оплата: умножается на силу менеджера */
  order: { natural: 0.7, medianMin: 25, spread: 4, nurtureClick: 0.35, nurtureConvert: 0.55 },
};

export const GEN = {
  days: 180,
  /** Визитёров в средний день (до сезонности и роста) */
  visitorsPerDay: 58,
  /** Рост к концу периода: множитель в первый и последний день */
  growthFrom: 0.62,
  growthTo: 1.7,
  /** Сезонность по дням недели, пн…вс */
  weekday: [1.1, 1.06, 1.0, 0.98, 0.88, 0.8, 0.96] as const,
  /** Вероятность старта бота после последнего касания (до множителя источника) */
  botStart: 0.43,
  blockPerMessage: 0.025,
  refundRate: 0.07,
  repeatPurchase: 0.16,
  /** Отток подписки клуба в месяц и сколько месяцев максимум продлевают */
  clubChurn: 0.12,
  clubMaxMonths: 12,
  /** Доля рассрочек там, где она доступна: дорогие форматы почти всегда берут частями */
  installmentShare: 0.8,
  /** Конверсия в покупку растёт к концу периода (прогрев и дожимы дорабатываются) */
  buyGrowthFrom: 0.85,
  buyGrowthTo: 1.4,
  petalsDiscountShare: 0.55,
  quizShare: 0.38,
  /** Клиентки, пришедшие до начала периода: участницы клуба и рассрочки 1:1 */
  legacyClub: 150,
  legacyClubChurn: 0.04,
  legacyInstallments: 10,
};
