/**
 * Формулы метрик — чистые функции без зависимостей от данных и UI.
 *
 * Соглашения:
 * - доли и проценты возвращаются долями (0.25 = 25%), в проценты их переводит format.ts;
 * - деление на ноль даёт null («нет данных»), а не 0 или Infinity;
 * - деньги — рубли.
 */

export type Ratio = number | null;

/** a / b, или null, если делить не на что */
export function safeDiv(a: number, b: number): Ratio {
  return b === 0 || !Number.isFinite(b) ? null : a / b;
}

export const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);

export const mean = (xs: readonly number[]): Ratio => safeDiv(sum(xs), xs.length);

// ── Реклама ────────────────────────────────────────────────
/** CTR = клики / показы */
export const ctr = (clicks: number, impressions: number): Ratio => safeDiv(clicks, impressions);

/** CPC = расход / клики */
export const cpc = (spend: number, clicks: number): Ratio => safeDiv(spend, clicks);

/** CPM = расход / показы × 1000 */
export const cpm = (spend: number, impressions: number): Ratio => {
  const v = safeDiv(spend, impressions);
  return v === null ? null : v * 1000;
};

/** CPL = расход / лиды */
export const cpl = (spend: number, leads: number): Ratio => safeDiv(spend, leads);

/** CR = шаг / предыдущий шаг */
export const cr = (step: number, prevStep: number): Ratio => safeDiv(step, prevStep);

/** CAC = расход / новые клиенты */
export const cac = (spend: number, newCustomers: number): Ratio => safeDiv(spend, newCustomers);

// ── Деньги ─────────────────────────────────────────────────
/** Прибыль = выручка − расход */
export const profit = (revenue: number, spend: number): number => revenue - spend;

/** ROMI = (выручка − расход) / расход */
export const romi = (revenue: number, spend: number): Ratio => safeDiv(revenue - spend, spend);

/** ROAS = выручка / расход */
export const roas = (revenue: number, spend: number): Ratio => safeDiv(revenue, spend);

/** Средний чек = выручка / заказы */
export const avgCheck = (revenue: number, orders: number): Ratio => safeDiv(revenue, orders);

/** ARPU = выручка / все пользователи */
export const arpu = (revenue: number, users: number): Ratio => safeDiv(revenue, users);

/** ARPPU = выручка / платящие пользователи */
export const arppu = (revenue: number, payingUsers: number): Ratio => safeDiv(revenue, payingUsers);

/** LTV = средняя выручка клиента за всё время (по когорте) */
export const ltv = (revenuePerCustomer: readonly number[]): Ratio => mean(revenuePerCustomer);

/** LTV / CAC */
export const ltvCac = (ltvValue: Ratio, cacValue: Ratio): Ratio => (ltvValue === null || cacValue === null ? null : safeDiv(ltvValue, cacValue));

/** Churn = ушедшие / клиенты на начало периода */
export const churn = (lost: number, customersAtStart: number): Ratio => safeDiv(lost, customersAtStart);

/** Доля возвратов = сумма возвратов / gross-выручка */
export const refundRate = (refunds: number, gross: number): Ratio => safeDiv(Math.abs(refunds), gross);

/** Изменение к прошлому периоду: (сейчас − было) / |было| */
export const change = (current: number | null, previous: number | null): Ratio =>
  current === null || previous === null ? null : safeDiv(current - previous, Math.abs(previous));

/** Выполнение плана = факт / план */
export const planProgress = (fact: number, plan: number): Ratio => safeDiv(fact, plan);

/** Ожидаемый факт к концу месяца при текущем темпе */
export const runRate = (factSoFar: number, daysPassed: number, daysInMonth: number): Ratio => {
  const perDay = safeDiv(factSoFar, daysPassed);
  return perDay === null ? null : perDay * daysInMonth;
};

// ── Воронка ────────────────────────────────────────────────
export interface FunnelStepStats {
  count: number;
  /** CR к предыдущему шагу */
  crPrev: Ratio;
  /** CR к первому шагу */
  crFirst: Ratio;
  /** Потери относительно предыдущего шага */
  lost: number;
}

/** Метрики шагов воронки по количествам на каждом шаге */
export function funnel(counts: readonly number[]): FunnelStepStats[] {
  const first = counts[0] ?? 0;
  return counts.map((count, i) => {
    const prev = i === 0 ? count : counts[i - 1]!;
    return { count, crPrev: i === 0 ? null : cr(count, prev), crFirst: i === 0 ? null : cr(count, first), lost: i === 0 ? 0 : Math.max(0, prev - count) };
  });
}

/** Медиана (для времени между шагами) */
export function median(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

// ── Справочник метрик для подписей и тултипов ──────────────
export type MetricFormat = "rub" | "percent" | "number" | "ratio" | "duration";

export interface MetricDef {
  label: string;
  formula: string;
  format: MetricFormat;
  /** Рост метрики — хорошо или плохо (для цвета стрелки) */
  better: "up" | "down";
}

export const METRICS = {
  revenue: { label: "Выручка", formula: "Сумма оплат за период минус возвраты (net)", format: "rub", better: "up" },
  gross: { label: "Выручка gross", formula: "Сумма оплат за период без учёта возвратов", format: "rub", better: "up" },
  spend: { label: "Расход", formula: "Сумма рекламных расходов по всем кабинетам", format: "rub", better: "down" },
  profit: { label: "Прибыль", formula: "Выручка − Расход", format: "rub", better: "up" },
  romi: { label: "ROMI", formula: "(Выручка − Расход) / Расход × 100%", format: "percent", better: "up" },
  roas: { label: "ROAS", formula: "Выручка / Расход × 100%", format: "percent", better: "up" },
  leads: { label: "Лиды", formula: "Пользователи, прошедшие приветствие в Web App", format: "number", better: "up" },
  sales: { label: "Продажи", formula: "Оплаченные заказы (первая оплата), без возвратов", format: "number", better: "up" },
  crLeadPay: { label: "CR лид → оплата", formula: "Продажи / Лиды × 100%", format: "percent", better: "up" },
  avgCheck: { label: "Средний чек", formula: "Выручка / Оплаченные заказы", format: "rub", better: "up" },
  cac: { label: "CAC", formula: "Расход / Новые клиенты", format: "rub", better: "down" },
  ltv: { label: "LTV", formula: "Средняя выручка клиента за всё время", format: "rub", better: "up" },
  ltvCac: { label: "LTV / CAC", formula: "LTV / CAC (норма — от 3)", format: "ratio", better: "up" },
  impressions: { label: "Показы", formula: "Показы объявлений по данным кабинетов", format: "number", better: "up" },
  clicks: { label: "Клики", formula: "Все переходы с меткой: реклама, посевы, органика, рефералы", format: "number", better: "up" },
  ctr: { label: "CTR", formula: "Клики по платной рекламе / Показы × 100%", format: "percent", better: "up" },
  cpm: { label: "CPM", formula: "Расход / Показы × 1000", format: "rub", better: "down" },
  cpc: { label: "CPC", formula: "Расход / Клики по платной рекламе", format: "rub", better: "down" },
  cpl: { label: "CPL", formula: "Расход / Лиды", format: "rub", better: "down" },
  crClickLead: { label: "CR клик → лид", formula: "Лиды / Все клики × 100%", format: "percent", better: "up" },
  arpu: { label: "ARPU", formula: "Выручка / Все пользователи бота", format: "rub", better: "up" },
  arppu: { label: "ARPPU", formula: "Выручка / Платящие пользователи", format: "rub", better: "up" },
  refunds: { label: "Возвраты", formula: "Сумма возвратов за период", format: "rub", better: "down" },
  installmentShare: { label: "Доля рассрочек", formula: "Заказы в рассрочку / Оплаченные заказы × 100%", format: "percent", better: "up" },
  churn: { label: "Churn", formula: "Ушедшие / Клиенты на начало периода × 100%", format: "percent", better: "down" },
} as const satisfies Record<string, MetricDef>;

export type MetricKey = keyof typeof METRICS;
