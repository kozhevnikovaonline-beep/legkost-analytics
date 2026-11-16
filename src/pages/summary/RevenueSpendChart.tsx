/** Выручка и расход по дням, пунктиром — выручка прошлого периода */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useRevenueSpend } from "@/hooks/useData";
import { day, rub } from "@/lib/format";

export function RevenueSpendChart({ className }: { className?: string }) {
  const q = useRevenueSpend();
  const p = usePalette();
  const option = useMemo<EChartsOption | null>(() => {
    const d = q.data;
    if (!d) return null;
    const labels = d.current.map((x) => day(x.date));
    const series: EChartsOption["series"] = [
      { name: "Расход", type: "bar", data: d.current.map((x) => x.spend), itemStyle: { color: p.series[2], borderRadius: [3, 3, 0, 0], opacity: 0.75 }, barMaxWidth: 14 },
      {
        name: "Выручка",
        type: "line",
        data: d.current.map((x) => x.revenue),
        smooth: 0.3,
        smoothMonotone: "x",
        symbol: "circle",
        symbolSize: 5,
        showSymbol: d.current.length <= 31,
        lineStyle: { width: 2.5, color: p.series[0] },
        itemStyle: { color: p.series[0] },
        areaStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${p.series[0]}40` }, { offset: 1, color: `${p.series[0]}00` }] },
        },
      },
    ];
    if (d.previous) {
      series.push({ name: "Выручка, прошлый период", type: "line", data: d.previous.map((x) => x.revenue), smooth: 0.3,
        smoothMonotone: "x", showSymbol: false, lineStyle: { width: 1.5, type: "dashed", color: p.muted }, itemStyle: { color: p.muted } });
    }
    return {
      ...baseOption(p),
      tooltip: {
        ...(baseOption(p).tooltip as object),
        trigger: "axis",
        valueFormatter: (v) => rub(typeof v === "number" ? v : null),
      },
      xAxis: { type: "category", data: labels, ...axisStyle(p), splitLine: { show: false } },
      yAxis: { type: "value", ...axisStyle(p), axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => rub(v, true) } },
      series,
    };
  }, [q.data, p]);

  return (
    <ChartCard
      className={className}
      title="Выручка и расход по дням"
      hint="Выручка — оплаты минус возвраты (net), расход — рекламные кабинеты. Пунктир — выручка прошлого периода той же длины."
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && q.data.current.every((x) => x.revenue === 0 && x.spend === 0)}
      height={300}
    >
      {option && <EChart option={option} height={300} ariaLabel="График выручки и расхода по дням" />}
    </ChartCard>
  );
}
