/** Рейтинг менеджеров: заказы, продажи, конверсия, выручка, средний чек, возвраты, план */
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Medal } from "lucide-react";
import { ChartCard } from "@/components/widgets/ChartCard";
import { DataTable, type ColumnMeta } from "@/components/widgets/DataTable";
import { useManagers } from "@/hooks/useData";
import type { ExportColumn } from "@/lib/export";
import { num, pct, rub } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/filters";
import type { ManagerRow } from "@/types/dto";

const right = { align: "right" } satisfies ColumnMeta;
const MEDAL = ["text-[#E8B004]", "text-[#9AA3AE]", "text-[#C47A3D]"];

export function ManagersTable() {
  const q = useManagers();
  const selected = useFilters((s) => s.managerIds);
  const toggle = useFilters((s) => s.toggle);
  const rows = q.data ?? [];

  const columns = useMemo<ColumnDef<ManagerRow>[]>(
    () => [
      {
        id: "name",
        header: "Менеджер",
        accessorFn: (r) => r.name,
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const place = rows.findIndex((x) => x.managerId === r.managerId);
          return (
            <div className="flex items-center gap-2.5">
              <span className={cn("grid size-7 place-items-center rounded-full bg-muted text-xs font-bold", place < 3 && MEDAL[place])}>{place < 3 ? <Medal className="size-4" /> : place + 1}</span>
              <span className="grid size-8 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{r.name[0]}</span>
              <span>
                <span className="block font-semibold">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{r.role === "curator" ? "Куратор" : "Отдел продаж"}</span>
              </span>
            </div>
          );
        },
      },
      { id: "orders", header: "Заказы", accessorFn: (r) => r.orders, cell: ({ getValue }) => num(getValue<number>()), meta: right, sortDescFirst: true },
      { id: "sales", header: "Продажи", accessorFn: (r) => r.sales, cell: ({ getValue }) => num(getValue<number>()), meta: right, sortDescFirst: true },
      { id: "conversion", header: "Заказ → оплата", accessorFn: (r) => r.conversion ?? -1, cell: ({ row }) => pct(row.original.conversion), meta: right, sortDescFirst: true },
      { id: "revenue", header: "Выручка", accessorFn: (r) => r.revenue, cell: ({ getValue }) => <b>{rub(getValue<number>())}</b>, meta: right, sortDescFirst: true },
      { id: "avgCheck", header: "Средний чек", accessorFn: (r) => r.avgCheck ?? -1, cell: ({ row }) => rub(row.original.avgCheck), meta: right, sortDescFirst: true },
      { id: "refunds", header: "Возвраты", accessorFn: (r) => r.refunds, cell: ({ getValue }) => <span className={cn(getValue<number>() > 0 && "text-negative")}>{rub(getValue<number>())}</span>, meta: right },
      {
        id: "plan",
        header: "План на период",
        accessorFn: (r) => r.planProgress ?? -1,
        sortDescFirst: true,
        meta: right,
        cell: ({ row }) => {
          const r = row.original;
          const prog = r.planProgress ?? 0;
          return (
            <div className="ml-auto flex w-44 flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{rub(r.plan, r.plan >= 1_000_000)}</span>
                <b className={prog >= 1 ? "text-positive" : prog < 0.7 ? "text-negative" : undefined}>{pct(r.planProgress)}</b>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className={cn("h-full rounded-full", prog >= 1 ? "bg-lime-ink" : "bg-primary")} style={{ width: `${Math.min(100, prog * 100)}%` }} />
              </div>
            </div>
          );
        },
      },
    ],
    [rows],
  );

  const exportColumns = useMemo<ExportColumn<ManagerRow & { __depth: number }>[]>(
    () => [
      { header: "Менеджер", value: (r) => r.name, width: 22 },
      { header: "Роль", value: (r) => (r.role === "curator" ? "Куратор" : "Отдел продаж") },
      { header: "Заказы", value: (r) => r.orders, numFmt: "#,##0.0" },
      { header: "Продажи", value: (r) => r.sales, numFmt: "#,##0.0" },
      { header: "Заказ → оплата", value: (r) => r.conversion, numFmt: "0.0%" },
      { header: "Выручка, ₽", value: (r) => r.revenue, numFmt: "#,##0" },
      { header: "Средний чек, ₽", value: (r) => r.avgCheck, numFmt: "#,##0" },
      { header: "Возвраты, ₽", value: (r) => r.refunds, numFmt: "#,##0" },
      { header: "План, ₽", value: (r) => r.plan, numFmt: "#,##0" },
      { header: "Выполнение плана", value: (r) => r.planProgress, numFmt: "0.0%" },
    ],
    [],
  );

  return (
    <ChartCard
      title="Рейтинг менеджеров"
      hint="Заказы и продажи курсов и форматов, которые вёл менеджер. Заказ → оплата = оплаченные заказы / все заказы менеджера. План на период = месячный план × дней периода / 30. Клик по строке — фильтр по менеджеру."
      subtitle="Клик по строке фильтрует страницу"
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && rows.length === 0}
      height={220}
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.managerId}
        initialSorting={[{ id: "revenue", desc: true }]}
        exportName="managers"
        exportColumns={exportColumns}
        onRowClick={(r) => toggle("managerIds", r.managerId)}
        isRowActive={(r) => selected.includes(r.managerId)}
      />
    </ChartCard>
  );
}
