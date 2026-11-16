/**
 * Таблица трафика с drill-down: источник → кампания → объявление → лиды → карточка клиента.
 * Значок воронки в строке фильтрует всю страницу по этому источнику / кампании / объявлению.
 */
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, Filter, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartCard } from "@/components/widgets/ChartCard";
import { DataTable, metricColumn, type ColumnMeta } from "@/components/widgets/DataTable";
import { useTrafficTable } from "@/hooks/useData";
import type { ExportColumn } from "@/lib/export";
import { cpl, cr, romi, sum } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { useFilters, type ListKey } from "@/store/filters";
import type { TrafficRow } from "@/types/dto";
import { LeadsSheet } from "./LeadsSheet";

const LEVEL_KEY: Record<TrafficRow["level"], ListKey> = { source: "sourceIds", campaign: "campaignIds", ad: "adIds" };
const LEVEL_LABEL: Record<TrafficRow["level"], string> = { source: "источнику", campaign: "кампании", ad: "объявлению" };

export function TrafficTable() {
  const q = useTrafficTable();
  const f = useFilters();
  const [leadsAd, setLeadsAd] = useState<TrafficRow | null>(null);
  const rows = q.data ?? [];

  const active = (r: TrafficRow) => (f[LEVEL_KEY[r.level]] as string[]).includes(r.id);

  const columns = useMemo<ColumnDef<TrafficRow>[]>(() => {
    const tot = (k: keyof TrafficRow["metrics"]) => sum(rows.map((r) => (r.metrics[k] as number | null) ?? 0));
    const spend = tot("spend");
    const leads = tot("leads");
    return [
      {
        id: "name",
        accessorFn: (r) => r.name,
        header: "Источник / кампания / объявление",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-1.5" style={{ paddingLeft: row.depth * 18 }}>
              {row.getCanExpand() ? (
                <button type="button" onClick={(e) => (e.stopPropagation(), row.toggleExpanded())} className="grid size-6 place-items-center rounded hover:bg-muted" aria-label={row.getIsExpanded() ? "Свернуть" : "Развернуть"}>
                  <ChevronRight className={cn("size-4 transition-transform", row.getIsExpanded() && "rotate-90")} />
                </button>
              ) : (
                <span className="size-6" />
              )}
              <span className="max-w-64 truncate" title={r.name}>
                {r.name}
              </span>
              {r.level === "source" && !r.isPaid && (
                <Badge variant="secondary" className="text-[10px]">
                  без расхода
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => (e.stopPropagation(), f.toggle(LEVEL_KEY[r.level], r.id))}
                    className={cn("ml-1 grid size-6 place-items-center rounded text-muted-foreground opacity-50 hover:bg-accent hover:text-primary hover:opacity-100", active(r) && "text-primary opacity-100")}
                    aria-label={`Фильтр по ${LEVEL_LABEL[r.level]} «${r.name}»`}
                  >
                    <Filter className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{active(r) ? "Снять фильтр" : `Отфильтровать страницу по ${LEVEL_LABEL[r.level]}`}</TooltipContent>
              </Tooltip>
              {r.level === "ad" && (
                <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs" onClick={(e) => (e.stopPropagation(), setLeadsAd(r))}>
                  <Users className="size-3.5" /> Лиды
                </Button>
              )}
            </div>
          );
        },
        footer: "Итого",
      },
      metricColumn<TrafficRow>("impressions", (r) => r.metrics.impressions, { footer: tot("impressions") }),
      metricColumn<TrafficRow>("clicks", (r) => r.metrics.clicks, { footer: tot("clicks") }),
      metricColumn<TrafficRow>("ctr", (r) => r.metrics.ctr),
      metricColumn<TrafficRow>("spend", (r) => r.metrics.spend, { footer: spend }),
      metricColumn<TrafficRow>("cpc", (r) => r.metrics.cpc),
      metricColumn<TrafficRow>("leads", (r) => r.metrics.leads, { footer: leads }),
      metricColumn<TrafficRow>("cpl", (r) => r.metrics.cpl, { footer: cpl(spend, leads) }),
      metricColumn<TrafficRow>("crClickLead", (r) => r.metrics.crClickLead, { footer: cr(leads, tot("clicks")) }),
      metricColumn<TrafficRow>("sales", (r) => r.metrics.sales, { footer: tot("sales") }),
      metricColumn<TrafficRow>("revenue", (r) => r.metrics.revenue, { footer: tot("revenue") }),
      metricColumn<TrafficRow>("romi", (r) => r.metrics.romi, { footer: romi(tot("revenue"), spend) }),
      metricColumn<TrafficRow>("cac", (r) => r.metrics.cac),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, f.sourceIds, f.campaignIds, f.adIds]);

  const exportColumns = useMemo<ExportColumn<TrafficRow & { __depth: number }>[]>(
    () => [
      { header: "Уровень", value: (r) => ({ source: "Источник", campaign: "Кампания", ad: "Объявление" })[r.level], width: 12 },
      { header: "Название", value: (r) => `${"  ".repeat(r.__depth)}${r.name}`, width: 36 },
      { header: "Показы", value: (r) => r.metrics.impressions, numFmt: "#,##0" },
      { header: "Клики", value: (r) => r.metrics.clicks, numFmt: "#,##0" },
      { header: "CTR", value: (r) => r.metrics.ctr, numFmt: "0.00%" },
      { header: "Расход, ₽", value: (r) => Math.round(r.metrics.spend), numFmt: "#,##0" },
      { header: "CPC, ₽", value: (r) => r.metrics.cpc, numFmt: "#,##0.0" },
      { header: "Лиды", value: (r) => r.metrics.leads, numFmt: "#,##0.0" },
      { header: "CPL, ₽", value: (r) => r.metrics.cpl, numFmt: "#,##0" },
      { header: "CR клик → лид", value: (r) => r.metrics.crClickLead, numFmt: "0.0%" },
      { header: "Продажи", value: (r) => r.metrics.sales, numFmt: "#,##0.0" },
      { header: "Выручка, ₽", value: (r) => Math.round(r.metrics.revenue), numFmt: "#,##0" },
      { header: "ROMI", value: (r) => r.metrics.romi, numFmt: "0.0%" },
      { header: "CAC, ₽", value: (r) => r.metrics.cac, numFmt: "#,##0" },
    ],
    [],
  );

  return (
    <ChartCard
      title="Источники, кампании и объявления"
      hint="Метрики до денег. Расход, показы и клики — по данным кабинетов; лиды, продажи, выручка и CAC распределены по объявлениям выбранной моделью атрибуции, поэтому могут быть дробными."
      subtitle="Стрелка раскрывает уровень, значок воронки фильтрует страницу, «Лиды» — список лидов объявления"
      loading={q.isLoading}
      error={q.error}
      height={420}
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => `${r.level}:${r.id}`}
        getSubRows={(r) => r.children}
        initialSorting={[{ id: "spend", desc: true }]}
        searchPlaceholder="Найти кампанию или объявление"
        exportName="marketing-traffic"
        exportColumns={exportColumns}
        isRowActive={active}
        footer
      />
      <LeadsSheet ad={leadsAd} onClose={() => setLeadsAd(null)} />
    </ChartCard>
  );
}

export type { ColumnMeta };
