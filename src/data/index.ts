/** Выбор источника данных: VITE_DATA_SOURCE=mock (по умолчанию) | api */
import type { DataSource } from "./DataSource.ts";
import { MockDataSource } from "./mock/MockDataSource.ts";
import { ApiDataSource } from "./api/ApiDataSource.ts";

function create(): DataSource {
  if (import.meta.env.VITE_DATA_SOURCE === "api") {
    const url = import.meta.env.VITE_API_URL;
    if (!url) throw new Error("VITE_DATA_SOURCE=api требует VITE_API_URL");
    return new ApiDataSource(url);
  }
  return new MockDataSource();
}

export const dataSource: DataSource = create();
export type { DataSource };
