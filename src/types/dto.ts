/**
 * Формы ответов DataSource — то, что получает UI. Одинаковы для моков и будущего REST API.
 * Новые DTO добавляются вместе со страницами (шаг 4).
 */
import type { ID, ISODate, ProductCategory, SourceId } from "./domain.ts";

export interface DataMeta {
  /** Откуда данные: генератор в браузере или REST API */
  kind: "mock" | "api";
  /** Первый и последний день, за которые есть данные */
  startDate: ISODate;
  endDate: ISODate;
  timezone: "Europe/Moscow";
  currency: "RUB";
}

export interface Option<T extends string = ID> {
  id: T;
  name: string;
}

export interface FilterOptions {
  sources: (Option<SourceId> & { isPaid: boolean })[];
  campaigns: (Option & { sourceId: SourceId })[];
  ads: (Option & { campaignId: ID })[];
  products: (Option & { category: ProductCategory })[];
  managers: Option[];
}
