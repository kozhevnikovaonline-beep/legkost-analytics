/** Светлая / тёмная тема: класс .dark на <html>, выбор сохраняется */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  toggle(): void;
}

const systemTheme = (): Theme => (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: systemTheme(),
      toggle: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "legkost-analytics:theme" },
  ),
);

const apply = (t: Theme) => document.documentElement.classList.toggle("dark", t === "dark");
apply(useTheme.getState().theme);
useTheme.subscribe((s) => apply(s.theme));
