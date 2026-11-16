import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // ECharts (~215 КБ gzip) и exceljs (~256 КБ) — отдельные чанки, грузятся только на страницах с графиками и при экспорте
  build: { chunkSizeWarningLimit: 1000 },
  test: { include: ["tests/**/*.test.ts"] },
});
