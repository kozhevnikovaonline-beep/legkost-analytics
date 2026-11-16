/**
 * Сгенерированная «база» в памяти браузера. Генерация (~0,3 с) выполняется один раз —
 * при первом обращении, после первой отрисовки интерфейса, чтобы сразу показать скелетоны.
 */
import type { Dataset } from "../../types/domain.ts";
import { mskToday } from "../../lib/dates.ts";
import { DEFAULT_SEED, generateDataset } from "./generate.ts";

let cached: Promise<Dataset> | null = null;

export function getDataset(): Promise<Dataset> {
  cached ??= new Promise((resolve) => {
    setTimeout(() => resolve(generateDataset({ seed: DEFAULT_SEED, endDate: mskToday(), now: Date.now() })), 0);
  });
  return cached;
}
