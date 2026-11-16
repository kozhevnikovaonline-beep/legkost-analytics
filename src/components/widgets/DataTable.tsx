/**
 * Таблица на TanStack Table: сортировка, раскрытие уровней (drill-down), поиск, итоговая строка,
 * экспорт видимых строк в CSV/XLSX. Переиспользуется на страницах Маркетинг, Продажи, Клиенты.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { exportCsv, exportXlsx, type ExportColumn } from "@/lib/export";
import { metricValue } from "@/lib/format";
import { METRICS, type MetricFormat, type MetricKey } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { MetricTooltip } from "./MetricTooltip";

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  getSubRows?: (row: T) => T[] | undefined;
  initialSorting?: SortingState;
  /** Имя файла и листа для экспорта */
  exportName?: string;
  exportColumns?: ExportColumn<T & { __depth: number }>[];
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Подсветить строку (например, выбранную в фильтре) */
  isRowActive?: (row: T) => boolean;
  footer?: boolean;
  maxHeight?: number;
  emptyText?: string;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  getSubRows,
  initialSorting = [],
  exportName,
  exportColumns,
  searchPlaceholder,
  toolbar,
  onRowClick,
  isRowActive,
  footer,
  maxHeight = 560,
  emptyText = "Нет строк под выбранные фильтры",
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded, globalFilter },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (r) => getRowId(r),
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFromLeafRows: true,
  });

  const rows = table.getRowModel().rows;

  /** Для экспорта — все строки с учётом сортировки и поиска, вместе с вложенными */
  const exportRows = useMemo(() => {
    const out: (T & { __depth: number })[] = [];
    const walk = (list: Row<T>[]) => {
      for (const r of list) {
        out.push({ ...r.original, __depth: r.depth });
        if (r.subRows.length) walk(r.subRows);
      }
    };
    walk(table.getPrePaginationRowModel().rows.filter((r) => r.depth === 0));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getPrePaginationRowModel().rows]);

  return (
    <div className="flex flex-col gap-3">
      {(searchPlaceholder || exportColumns || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <div className="relative min-w-52 flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 pl-8" placeholder={searchPlaceholder} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
            </div>
          )}
          {toolbar}
          {exportColumns && exportName && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto h-9 gap-2 font-semibold">
                  <Download className="size-4" /> Экспорт
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportCsv(exportName, exportColumns, exportRows)}>CSV (Excel, Google Таблицы)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void exportXlsx(exportName, exportName, exportColumns, exportRows)}>XLSX (Excel)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="overflow-auto rounded-lg border" style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const meta = h.column.columnDef.meta as ColumnMeta | undefined;
                  const align = meta?.align;
                  return (
                    <th key={h.id} className={cn("border-b px-3 py-2 text-xs font-bold whitespace-nowrap text-muted-foreground", align === "right" ? "text-right" : "text-left")}>
                      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
                        {h.isPlaceholder ? null : h.column.getCanSort() ? (
                          <button type="button" onClick={h.column.getToggleSortingHandler()} className={cn("inline-flex items-center gap-1 hover:text-foreground", align === "right" && "flex-row-reverse")}>
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? <ArrowUp className="size-3.5" /> : sorted === "desc" ? <ArrowDown className="size-3.5" /> : <ChevronsUpDown className="size-3.5 opacity-40" />}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                        {meta?.hint && <MetricTooltip title={meta.hint.title} formula={meta.hint.formula} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                className={cn(
                  "border-b last:border-0 transition-colors hover:bg-muted/60",
                  r.depth === 0 && getSubRows && "font-semibold",
                  r.depth > 0 && "bg-muted/25",
                  onRowClick && "cursor-pointer",
                  isRowActive?.(r.original) && "bg-accent/70 hover:bg-accent",
                )}
              >
                {r.getVisibleCells().map((c) => {
                  const align = (c.column.columnDef.meta as ColumnMeta | undefined)?.align;
                  return (
                    <td key={c.id} className={cn("px-3 py-2 whitespace-nowrap tabular-nums", align === "right" && "text-right")}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {footer && rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-muted/95 font-bold backdrop-blur">
              {table.getFooterGroups().map((fg) => (
                <tr key={fg.id}>
                  {fg.headers.map((h) => {
                    const align = (h.column.columnDef.meta as ColumnMeta | undefined)?.align;
                    return (
                      <td key={h.id} className={cn("border-t px-3 py-2 whitespace-nowrap tabular-nums", align === "right" && "text-right")}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.footer, h.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export interface ColumnMeta {
  align?: "left" | "right";
  /** Тултип с формулой рядом с заголовком (вне кнопки сортировки) */
  hint?: { title: string; formula: string };
}

/** Числовая колонка метрики: подпись и формула из справочника METRICS, форматирование по типу */
export function metricColumn<T>(key: MetricKey, accessor: (row: T) => number | null, opts: { header?: string; footer?: number | null; format?: MetricFormat } = {}): ColumnDef<T> {
  const def = METRICS[key];
  const format = opts.format ?? def.format;
  return {
    id: key,
    accessorFn: (r) => accessor(r) ?? Number.NEGATIVE_INFINITY,
    header: opts.header ?? def.label,
    cell: ({ row }) => {
      const v = accessor(row.original);
      return <span className={cn(v !== null && v < 0 && "text-negative")}>{metricValue(v, format === "rub" ? "rub" : format)}</span>;
    },
    footer: opts.footer === undefined ? undefined : () => metricValue(opts.footer ?? null, format),
    sortDescFirst: true,
    meta: { align: "right", hint: { title: def.label, formula: def.formula } } satisfies ColumnMeta,
  };
}
