/**
 * Экспорт таблиц в CSV и XLSX.
 * CSV — с BOM и разделителем «;», чтобы русский Excel открыл его без мастера импорта.
 * XLSX — через exceljs, библиотека подгружается только при первом экспорте.
 */

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null;
  /** Формат числа в Excel, например «#,##0 ₽» или «0.0%» */
  numFmt?: string;
  width?: number;
}

const csvCell = (v: string | number | null): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v * 10000) / 10000).replace(".", ",") : "";
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(";"), ...rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(";"))];
  return `﻿${lines.join("\r\n")}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  download(new Blob([toCsv(columns, rows)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportXlsx<T>(filename: string, sheetName: string, columns: ExportColumn<T>[], rows: T[]): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Онлайн-школа Алёны Ветровой · Аналитика";
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width ?? Math.max(12, c.header.length + 2), style: c.numFmt ? { numFmt: c.numFmt } : {} }));
  for (const r of rows) ws.addRow(columns.map((c) => c.value(r)));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDB1068" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}
