/**
 * Модели атрибуции: как распределить конверсию (лид, выручку) между касаниями клиента.
 * - first_click — всё первому касанию;
 * - last_click — всё последнему касанию до конверсии;
 * - linear — поровну между всеми касаниями.
 */
import type { Attribution } from "../types/filters.ts";

export interface Weighted<T> {
  touch: T;
  weight: number;
}

/** Веса касаний (сумма = 1). Касания позже момента конверсии не учитываются */
export function attribute<T extends { at: string }>(touches: readonly T[], model: Attribution, conversionAt?: string): Weighted<T>[] {
  const path = touches.filter((t) => !conversionAt || t.at <= conversionAt).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  if (!path.length) return [];
  switch (model) {
    case "first_click":
      return [{ touch: path[0]!, weight: 1 }];
    case "last_click":
      return [{ touch: path[path.length - 1]!, weight: 1 }];
    case "linear":
      return path.map((touch) => ({ touch, weight: 1 / path.length }));
  }
}

/** Распределить значение (например, выручку заказа) по ключу касания (источник, кампания, объявление) */
export function distribute<T extends { at: string }>(
  value: number,
  touches: readonly T[],
  model: Attribution,
  key: (t: T) => string | null,
  into: Map<string, number>,
  conversionAt?: string,
): void {
  for (const { touch, weight } of attribute(touches, model, conversionAt)) {
    const k = key(touch);
    if (k !== null) into.set(k, (into.get(k) ?? 0) + value * weight);
  }
}
