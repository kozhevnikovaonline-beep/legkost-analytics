/**
 * Контракт источника данных. UI знает только этот интерфейс.
 * Реализации: MockDataSource (генератор в браузере) и ApiDataSource (REST API, заглушка).
 * Каждый метод = один виджет/экран = один эндпоинт будущего бэкенда (таблица в README).
 * Методы для страниц добавляются по мере их реализации (шаг 4).
 */
import type { DataMeta, FilterOptions } from "../types/dto.ts";

export interface DataSource {
  /** Диапазон данных, валюта, таймзона — GET /api/meta */
  getMeta(): Promise<DataMeta>;
  /** Значения для слайсеров — GET /api/filters/options */
  getFilterOptions(): Promise<FilterOptions>;
}
