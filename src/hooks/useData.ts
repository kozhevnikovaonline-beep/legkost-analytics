/** Запросы к DataSource через TanStack Query. Ключ запроса включает фильтры — кэш на каждый срез */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { dataSource } from "../data/index.ts";
import { pickFilters, useFilters } from "../store/filters.ts";
import type { Filters } from "../types/filters.ts";

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: () => dataSource.getMeta(), staleTime: Infinity });
}

export function useFilterOptions() {
  return useQuery({ queryKey: ["filter-options"], queryFn: () => dataSource.getFilterOptions(), staleTime: Infinity });
}

/** Текущие фильтры без действий (стабильная ссылка, пока значения не меняются) */
export function useCurrentFilters(): Filters {
  return useFilters(useShallow(pickFilters));
}

/** Запрос виджета: ключ = имя + фильтры; при смене фильтров старые данные видны, пока грузятся новые */
function useWidget<T>(name: string, fn: (f: Filters) => Promise<T>) {
  const f = useCurrentFilters();
  return useQuery({ queryKey: [name, f], queryFn: () => fn(f), placeholderData: keepPreviousData });
}

export const useKpis = () => useWidget("kpis", (f) => dataSource.getKpis(f));
export const useRevenueSpend = () => useWidget("revenue-spend", (f) => dataSource.getRevenueSpendSeries(f));
export const useFunnel = () => useWidget("funnel", (f) => dataSource.getFunnel(f));
export const useTopSources = () => useWidget("top-sources", (f) => dataSource.getTopSources(f));
export const usePlanFact = () => useWidget("plan-fact", (f) => dataSource.getPlanFact(f));

export const useMarketingKpis = () => useWidget("marketing-kpis", (f) => dataSource.getMarketingKpis(f));
export const useDailyTraffic = () => useWidget("daily-traffic", (f) => dataSource.getDailyTraffic(f));
export const useTrafficTable = () => useWidget("traffic-table", (f) => dataSource.getTrafficTable(f));

/** Лиды объявления (drill-down) — запрос только когда объявление выбрано */
export function useLeadsByAd(adId: string | null) {
  const f = useCurrentFilters();
  return useQuery({ queryKey: ["leads-by-ad", adId, f], queryFn: () => dataSource.getLeadsByAd(f, adId!), enabled: !!adId });
}

export const useStalls = () => useWidget("stalls", (f) => dataSource.getStalls(f));
export const useFunnelBySource = () => useWidget("funnel-by-source", (f) => dataSource.getFunnelBySource(f));

export const useSalesKpis = () => useWidget("sales-kpis", (f) => dataSource.getSalesKpis(f));
export const useSalesBreakdown = () => useWidget("sales-breakdown", (f) => dataSource.getSalesBreakdown(f));
export const useManagers = () => useWidget("managers", (f) => dataSource.getManagers(f));
