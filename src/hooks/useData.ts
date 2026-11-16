/** Запросы к DataSource через TanStack Query. Ключ запроса включает фильтры — кэш на каждый срез */
import { useQuery } from "@tanstack/react-query";
import { dataSource } from "../data/index.ts";

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: () => dataSource.getMeta(), staleTime: Infinity });
}

export function useFilterOptions() {
  return useQuery({ queryKey: ["filter-options"], queryFn: () => dataSource.getFilterOptions(), staleTime: Infinity });
}
