/**
 * Глобальные фильтры (слайсеры + кросс-фильтры) — одно состояние на все страницы.
 * Синхронизируется со строкой адреса: ссылка открывает тот же срез данных.
 */
import { create } from "zustand";
import type { FunnelStep, ID, ISODate } from "../types/domain.ts";
import type { Attribution, CompareMode, DatePreset, Filters } from "../types/filters.ts";
import { mskToday } from "../lib/dates.ts";
import { presetRange } from "../lib/period.ts";
import { filtersToQuery, queryToFilters } from "../lib/urlFilters.ts";

export type ListKey = "sourceIds" | "campaignIds" | "adIds" | "productIds" | "managerIds";

export function defaultFilters(today: ISODate = mskToday()): Filters {
  return {
    preset: "30d",
    ...presetRange("30d", today),
    compare: "previous_period",
    attribution: "last_click",
    sourceIds: [],
    campaignIds: [],
    adIds: [],
    productIds: [],
    managerIds: [],
    funnelStep: null,
  };
}

interface FiltersActions {
  setPreset(preset: Exclude<DatePreset, "custom">): void;
  setRange(from: ISODate, to: ISODate): void;
  setCompare(mode: CompareMode): void;
  setAttribution(a: Attribution): void;
  setList(key: ListKey, ids: ID[]): void;
  /** Кросс-фильтр: клик по сегменту графика включает/выключает значение */
  toggle(key: ListKey, id: ID): void;
  setFunnelStep(step: FunnelStep | null): void;
  clear(key: ListKey | "funnelStep"): void;
  reset(): void;
  apply(f: Filters): void;
}

export type FiltersStore = Filters & FiltersActions;

/** Строка запроса из hash: "#/marketing?p=7d" → "p=7d" */
const hashQuery = () => window.location.hash.split("?")[1] ?? "";
const hashPath = () => window.location.hash.slice(1).split("?")[0] || "/";

function initial(): Filters {
  const defaults = defaultFilters();
  const f = queryToFilters(hashQuery(), defaults);
  // Для пресетов даты всегда считаются от сегодняшнего дня
  return f.preset === "custom" ? f : { ...f, ...presetRange(f.preset, mskToday()) };
}

export const useFilters = create<FiltersStore>()((set, get) => ({
  ...initial(),
  setPreset: (preset) => set({ preset, ...presetRange(preset, mskToday()) }),
  setRange: (from, to) => set({ preset: "custom", from: from <= to ? from : to, to: from <= to ? to : from }),
  setCompare: (compare) => set({ compare }),
  setAttribution: (attribution) => set({ attribution }),
  setList: (key, ids) => set({ [key]: ids } as Partial<Filters>),
  toggle: (key, id) => {
    const cur = get()[key] as ID[];
    set({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } as Partial<Filters>);
  },
  setFunnelStep: (funnelStep) => set({ funnelStep }),
  clear: (key) => set(key === "funnelStep" ? { funnelStep: null } : ({ [key]: [] } as Partial<Filters>)),
  reset: () => set(defaultFilters()),
  apply: (f) => set(f.preset === "custom" ? f : { ...f, ...presetRange(f.preset, mskToday()) }),
}));

/** Только данные фильтров, без действий — ключ для TanStack Query */
export function pickFilters(s: FiltersStore): Filters {
  const { preset, from, to, compare, attribution, sourceIds, campaignIds, adIds, productIds, managerIds, funnelStep } = s;
  return { preset, from, to, compare, attribution, sourceIds, campaignIds, adIds, productIds, managerIds, funnelStep };
}

/** Записать текущие фильтры в адрес (без новой записи в истории) */
export function writeFiltersToUrl(path = hashPath()): void {
  const q = filtersToQuery(pickFilters(useFilters.getState()));
  const next = `#${path}${q ? `?${q}` : ""}`;
  if (window.location.hash !== next) window.history.replaceState(window.history.state, "", next);
}

useFilters.subscribe(() => writeFiltersToUrl());

/** Сколько слайсеров активно (для бейджа «Сбросить») */
export function activeCount(f: Filters): number {
  return f.sourceIds.length + f.campaignIds.length + f.adIds.length + f.productIds.length + f.managerIds.length + (f.funnelStep ? 1 : 0);
}
