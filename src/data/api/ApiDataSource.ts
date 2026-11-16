/**
 * Реализация DataSource поверх REST API — заглушка для будущего бэкенда.
 * Ответы проверяются zod-схемами: если бэкенд вернул не то, UI покажет ошибку, а не сломается.
 *
 * TODO(backend): поднять API по таблице эндпоинтов из README и включить VITE_DATA_SOURCE=api.
 */
import { z } from "zod";
import type { DataSource } from "../DataSource.ts";
import type { DataMeta, FilterOptions } from "../../types/dto.ts";

const sourceId = z.enum(["yandex_direct", "vk_ads", "tg_ads", "tg_seeding", "organic", "referral"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const metaSchema = z.object({
  kind: z.literal("api"),
  startDate: isoDate,
  endDate: isoDate,
  timezone: z.literal("Europe/Moscow"),
  currency: z.literal("RUB"),
});

const optionsSchema = z.object({
  sources: z.array(z.object({ id: sourceId, name: z.string(), isPaid: z.boolean() })),
  campaigns: z.array(z.object({ id: z.string(), name: z.string(), sourceId })),
  ads: z.array(z.object({ id: z.string(), name: z.string(), campaignId: z.string() })),
  products: z.array(z.object({ id: z.string(), name: z.string(), category: z.enum(["lead_magnet", "tripwire", "subscription", "course", "mentorship"]) })),
  managers: z.array(z.object({ id: z.string(), name: z.string() })),
});

export class ApiDataSource implements DataSource {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async get<T>(path: string, schema: z.ZodType<T>, params?: URLSearchParams): Promise<T> {
    const url = `${this.baseUrl}${path}${params?.size ? `?${params}` : ""}`;
    // TODO(backend): авторизация (Bearer-токен админа) и обработка 401
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
    return schema.parse(await res.json());
  }

  getMeta(): Promise<DataMeta> {
    return this.get("/api/meta", metaSchema);
  }

  getFilterOptions(): Promise<FilterOptions> {
    return this.get("/api/filters/options", optionsSchema);
  }
}
