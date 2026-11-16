/**
 * Выбор источника данных: VITE_DATA_SOURCE=mock (по умолчанию) | api.
 * Реализация подгружается лениво при первом запросе: генератор и движок моков (или клиент API)
 * не попадают в стартовый бандл, интерфейс появляется быстрее.
 */
import type { DataSource } from "./DataSource.ts";

let impl: Promise<DataSource> | null = null;

function load(): Promise<DataSource> {
  impl ??=
    import.meta.env.VITE_DATA_SOURCE === "api"
      ? import("./api/ApiDataSource.ts").then((m) => {
          const url = import.meta.env.VITE_API_URL;
          if (!url) throw new Error("VITE_DATA_SOURCE=api требует VITE_API_URL");
          return new m.ApiDataSource(url);
        })
      : import("./mock/MockDataSource.ts").then((m) => new m.MockDataSource());
  return impl;
}

type Method = (...args: unknown[]) => Promise<unknown>;

/** Прокси с тем же контрактом: каждый метод дожидается загрузки реализации */
export const dataSource: DataSource = new Proxy({} as DataSource, {
  get: (_target, prop) => async (...args: unknown[]) => {
    const ds = await load();
    const fn = ds[prop as keyof DataSource] as unknown as Method;
    return fn.apply(ds, args);
  },
});

export type { DataSource };
