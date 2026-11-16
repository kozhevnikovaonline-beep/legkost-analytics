/** Сохранённые представления: страница + фильтры, хранятся в localStorage */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Filters } from "../types/filters.ts";

export interface SavedView {
  id: string;
  name: string;
  path: string;
  filters: Filters;
  createdAt: string;
}

interface ViewsStore {
  views: SavedView[];
  save(name: string, path: string, filters: Filters): void;
  remove(id: string): void;
}

export const useViews = create<ViewsStore>()(
  persist(
    (set) => ({
      views: [],
      save: (name, path, filters) =>
        set((s) => ({ views: [...s.views, { id: crypto.randomUUID(), name: name.trim() || "Без названия", path, filters, createdAt: new Date().toISOString() }] })),
      remove: (id) => set((s) => ({ views: s.views.filter((v) => v.id !== id) })),
    }),
    { name: "legkost-analytics:views", version: 1 },
  ),
);
