/** Разделы админки: меню, заголовки и состав виджетов (для заготовок страниц до шага 4) */
import { Bot, Filter, GraduationCap, LayoutDashboard, Megaphone, Plug, Users, Wallet, Grid3x3, type LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  widgets: string[];
  soon?: boolean;
  /** Временно скрыт из меню и маршрутов */
  hidden?: boolean;
}

export const NAV: NavItem[] = [
  {
    path: "/",
    title: "Сводка",
    description: "Главные деньги и конверсии школы за период",
    icon: LayoutDashboard,
    widgets: ["KPI: выручка, расход, прибыль, ROMI, ROAS, лиды, продажи, CR лид→оплата, средний чек, CAC, LTV, LTV/CAC", "Выручка и расход по дням", "Мини-воронка", "Топ источников по ROMI", "План / факт"],
  },
  {
    path: "/marketing",
    title: "Маркетинг",
    description: "Реклама до денег: от показа до оплаты",
    icon: Megaphone,
    widgets: ["Показы, клики, CTR, CPM, CPC, CPL, CR клик→лид", "Таблица источник → кампания → объявление с продажами, выручкой, ROMI, CAC", "Модель атрибуции: первый / последний клик / линейная"],
  },
  {
    path: "/funnel",
    title: "Воронка",
    description: "Где клиенты останавливаются и какие дожимы их возвращают",
    icon: Filter,
    widgets: ["Клик → бот → Web App → лид → уроки → заказ → оплата → повторная", "CR к предыдущему и первому шагу, потери, время между шагами", "Где остановились + эффективность дожимных постов", "Разрез по источникам"],
  },
  {
    path: "/sales",
    title: "Продажи",
    description: "Выручка, возвраты, рассрочки и менеджеры",
    icon: Wallet,
    widgets: ["Выручка gross / net, заказы, оплаты, возвраты", "Средний чек, ARPU, ARPPU, доля рассрочек", "Выручка по продуктам", "Рейтинг менеджеров"],
  },
  {
    path: "/cohorts",
    title: "Когорты",
    description: "Удержание и LTV по месяцу первой покупки",
    icon: Grid3x3,
    widgets: ["Тепловая карта Retention", "Тепловая карта LTV"],
    hidden: true,
  },
  {
    path: "/clients",
    title: "Клиенты",
    description: "База клиентов с поиском, фильтрами и карточкой",
    icon: Users,
    widgets: ["Таблица клиентов с поиском и фильтрами", "Карточка: хронология касаний и дожимов, покупки, LTV, теги"],
  },
  { path: "/bot", title: "Telegram-бот", description: "DAU/MAU, рассылки", icon: Bot, widgets: [], soon: true },
  { path: "/learning", title: "Обучение", description: "Доходимость курсов", icon: GraduationCap, widgets: [], soon: true },
  { path: "/integrations", title: "Интеграции", description: "Подключение кабинетов и CRM", icon: Plug, widgets: [], soon: true },
];

export const navByPath = (path: string): NavItem | undefined => NAV.find((n) => n.path === path && !n.hidden);
