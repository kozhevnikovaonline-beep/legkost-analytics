/** Продукты и цены — как в Telegram Mini App «ЛЁГКОСТЬ» (miniapp/shared/catalog.ts) */
import type { PricePlan, Product } from "../../types/domain.ts";

const one = (priceRub: number, label = "Доступ навсегда"): PricePlan[] => [{ id: "base", label, priceRub, installmentMonths: null }];

export const PRODUCTS: Product[] = [
  { id: "free-lessons", name: "3 бесплатных урока", category: "lead_magnet", plans: [{ id: "base", label: "Бесплатно", priceRub: 0, installmentMonths: null }] },

  { id: "guide-desserts", name: "Гайд «ПП-десерты»", category: "tripwire", plans: one(290) },
  { id: "guide-pelvic", name: "Гайд «Мышцы тазового дна»", category: "tripwire", plans: one(390) },
  { id: "guide-posture", name: "Гайд «Идеальная осанка»", category: "tripwire", plans: one(390) },
  { id: "guide-cellulite", name: "Гайд «Без целлюлита»", category: "tripwire", plans: one(390) },
  { id: "guide-cortisol", name: "Гайд «Кортизол под контролем»", category: "tripwire", plans: one(490) },
  { id: "guide-menu14", name: "Меню на 14 дней", category: "tripwire", plans: one(590) },
  { id: "marathon-edema", name: "Марафон «Минус отёки за 7 дней»", category: "tripwire", plans: one(990, "7 дней") },

  { id: "club", name: "Клуб «ЛЁГКОСТЬ»", category: "subscription", plans: [{ id: "1m", label: "1 месяц", priceRub: 990, installmentMonths: null }] },

  { id: "course-abs", name: "Курс «Плоский живот и осанка»", category: "course", plans: one(1490) },
  { id: "course-dry", name: "Курс «Сушка»", category: "course", plans: one(1990) },
  { id: "course-postpartum", name: "Курс «Тело после родов и КС»", category: "course", plans: one(2490) },
  { id: "course-hormones", name: "Курс «Гормоны и кортизол 40+»", category: "course", plans: one(2990) },
  {
    id: "group",
    name: "Онлайн-программа «Лёгкость» · групповой формат",
    category: "course",
    plans: [
      { id: "1m", label: "1 месяц", priceRub: 1990, installmentMonths: null },
      { id: "2m", label: "2 месяца", priceRub: 3490, installmentMonths: null },
      { id: "3m", label: "3 месяца", priceRub: 4790, installmentMonths: 3 },
    ],
  },
  {
    id: "personal",
    name: "Личное сопровождение 1:1",
    category: "mentorship",
    plans: [
      { id: "1m", label: "1 месяц", priceRub: 7900, installmentMonths: null },
      { id: "2m", label: "2 месяца", priceRub: 12500, installmentMonths: null },
      { id: "3m", label: "3 месяца", priceRub: 18900, installmentMonths: 3 },
      { id: "4m", label: "4 месяца", priceRub: 26600, installmentMonths: 4 },
      { id: "6m", label: "6 месяцев", priceRub: 40500, installmentMonths: 6 },
    ],
  },
];

export const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
