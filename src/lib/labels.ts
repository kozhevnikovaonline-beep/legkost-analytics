/** Русские подписи для значений домена */
import type { FunnelStep, LeadStatus, OrderStatus, ProductCategory } from "../types/domain.ts";

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  click: "Клик",
  bot_start: "Старт бота",
  webapp_open: "Открытие Web App",
  lead: "Лид",
  lesson_1: "Урок 1",
  lesson_2: "Урок 2",
  lesson_3: "Урок 3",
  order: "Заказ",
  payment: "Оплата",
  repeat_payment: "Повторная оплата",
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  lead_magnet: "Лид-магнит",
  tripwire: "Трипваер",
  subscription: "Подписка",
  course: "Курсы",
  mentorship: "Наставничество",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: "Создан",
  paid: "Оплачен",
  installment: "Рассрочка",
  refunded: "Возврат",
  cancelled: "Отменён",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новый",
  warming: "Прогрев",
  offer_sent: "Оффер",
  won: "Купил",
  lost: "Потерян",
};
