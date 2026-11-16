/** Реализация DataSource на сгенерированных данных: фильтрует «базу» и считает метрики через lib/metrics */
import type { DataSource } from "../DataSource.ts";
import type { DataMeta, FilterOptions } from "../../types/dto.ts";
import { getDataset } from "./db.ts";

/** Небольшая задержка, как у настоящего API, — чтобы были видны скелетоны */
const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

export class MockDataSource implements DataSource {
  async getMeta(): Promise<DataMeta> {
    const ds = await getDataset();
    return { kind: "mock", startDate: ds.generatedFor.startDate, endDate: ds.generatedFor.endDate, timezone: "Europe/Moscow", currency: "RUB" };
  }

  async getFilterOptions(): Promise<FilterOptions> {
    const [ds] = await Promise.all([getDataset(), latency()]);
    return {
      sources: ds.sources.map((s) => ({ id: s.id, name: s.name, isPaid: s.isPaid })),
      campaigns: ds.campaigns.map((c) => ({ id: c.id, name: c.name, sourceId: c.sourceId })),
      ads: ds.ads.map((a) => ({ id: a.id, name: a.name, campaignId: a.campaignId })),
      products: ds.products.filter((p) => p.category !== "lead_magnet").map((p) => ({ id: p.id, name: p.name, category: p.category })),
      managers: ds.managers.map((m) => ({ id: m.id, name: m.name })),
    };
  }
}
