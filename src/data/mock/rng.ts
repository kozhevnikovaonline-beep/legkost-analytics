/** Детерминированный генератор случайных чисел (mulberry32): одинаковый seed — одинаковые данные */
export interface Rng {
  /** [0, 1) */
  next(): number;
  /** Целое [min, max] */
  int(min: number, max: number): number;
  /** Вещественное [min, max) */
  float(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Выбор по весам */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Нормальное распределение (Бокс — Мюллер) */
  normal(mean: number, sd: number): number;
  /** Логнормальная задержка: медиана × разброс (для времени между шагами) */
  lognormal(median: number, spread: number): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)]!,
    weighted: (items, weight) => {
      const total = items.reduce((s, i) => s + weight(i), 0);
      let r = next() * total;
      for (const item of items) {
        r -= weight(item);
        if (r < 0) return item;
      }
      return items[items.length - 1]!;
    },
    normal: (mean, sd) => {
      const u = 1 - next();
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    lognormal: (median, spread) => median * Math.exp(rng.normal(0, Math.log(spread))),
  };
  return rng;
}
