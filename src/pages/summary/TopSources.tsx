/** Топ платных источников по ROMI: клик по столбцу — фильтр по источнику на всю страницу */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useTopSources } from "@/hooks/useData";
import { num, pct, rub } from "@/lib/format";
import { useFilters } from "@/store/filters";
import type { SourceId } from "@/types/domain";

export function TopSources({ className }: { className?: string }) {
  const q = useTopSources();
  const p = usePalette();
  const selected = useFilters((s) => s.sourceIds);
  const toggle = useFilters((s) => s.toggle);
  const attribution = useFilters((s) => s.attribution);

  const option = useMemo<EChartsOption | null>(() => {
    const rows = q.data ? [...q.data].reverse() : null;
    if (!rows) return null;
    return {
      ...baseOption(p),
      grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...(baseOption(p).tooltip as object),
        trigger: "item",
        formatter: (params: unknown) => {
          const r = rows[(params as { dataIndex: number }).dataIndex]!;
          return `<b>${r.name}</b><br/>ROMI: <b>${pct(r.romi)}</b><br/>Выручка: ${rub(r.revenue)}<br/>Расход: ${rub(r.spend)}<br/>Продажи: ${num(r.sales)}`;
        },
      },
      xAxis: { type: "value", ...axisStyle(p), axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => pct(v) } },
      yAxis: { type: "category", data: rows.map((r) => r.name), ...axisStyle(p), splitLine: { show: false }, axisLabel: { color: p.fg, fontSize: 12, fontWeight: 600 } },
      series: [
        {
          type: "bar",
          barMaxWidth: 22,
          data: rows.map((r) => {
            const dim = selected.length > 0 && !selected.includes(r.sourceId);
            return {
              value: r.romi ?? 0,
              itemStyle: { color: (r.romi ?? 0) < 0 ? p.negative : p.series[0], opacity: dim ? 0.3 : 1, borderRadius: (r.romi ?? 0) < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] },
            };
          }),
          label: { show: true, position: "right", color: p.fg, fontSize: 11, fontWeight: 700, formatter: (x: { value: unknown }) => pct(Number(x.value)) },
        },
      ],
    };
  }, [q.data, p, selected]);

  return (
    <ChartCard
      className={className}
      title="Топ источников по ROMI"
      hint={`ROMI = (Выручка − Расход) / Расход × 100%. Выручка распределена по источникам моделью атрибуции «${attribution === "first_click" ? "первый клик" : attribution === "linear" ? "линейная" : "последний клик"}». Клик по столбцу — фильтр по источнику.`}
      subtitle="Клик по столбцу фильтрует страницу"
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && q.data.every((r) => r.spend === 0)}
      height={300}
    >
      {option && (
        <EChart
          option={option}
          height={300}
          ariaLabel="Платные источники по ROMI"
          onClick={({ dataIndex }) => {
            const rows = [...(q.data ?? [])].reverse();
            const row = rows[dataIndex];
            if (row) toggle("sourceIds", row.sourceId as SourceId);
          }}
        />
      )}
    </ChartCard>
  );
}
