/** Динамика выручки: gross, возвраты (вниз) и net */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useSalesBreakdown } from "@/hooks/useData";
import { day, rub } from "@/lib/format";

export function SalesTimeline({ className }: { className?: string }) {
  const q = useSalesBreakdown();
  const p = usePalette();
  const d = q.data;
  const option = useMemo<EChartsOption | null>(() => {
    if (!d) return null;
    const labels = d.timeline.map((x) => (d.bucketDays === 1 ? day(x.start) : `с ${day(x.start)}`));
    return {
      ...baseOption(p),
      tooltip: { ...(baseOption(p).tooltip as object), trigger: "axis", valueFormatter: (v) => rub(typeof v === "number" ? Math.abs(v) : null) },
      xAxis: { type: "category", data: labels, ...axisStyle(p), splitLine: { show: false } },
      yAxis: { type: "value", ...axisStyle(p), axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => rub(v, true) } },
      series: [
        { name: "Выручка gross", type: "bar", stack: "s", data: d.timeline.map((x) => x.gross), itemStyle: { color: `${p.series[0]}55`, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 },
        { name: "Возвраты", type: "bar", stack: "s", data: d.timeline.map((x) => -x.refunds), itemStyle: { color: p.negative, borderRadius: [0, 0, 3, 3] }, barMaxWidth: 18 },
        { name: "Выручка net", type: "line", data: d.timeline.map((x) => x.net), smooth: 0.3, smoothMonotone: "x", showSymbol: d.timeline.length <= 31, symbolSize: 5, lineStyle: { width: 2.5, color: p.series[0] }, itemStyle: { color: p.series[0] } },
      ],
    };
  }, [d, p]);

  return (
    <ChartCard
      className={className}
      title="Выручка: gross, возвраты и net"
      hint="Gross — все успешные оплаты (полные, части рассрочки, продления клуба). Возвраты — красным вниз. Net = gross − возвраты. До 31 дня — по дням, дальше — по неделям."
      loading={q.isLoading}
      error={q.error}
      empty={!!d && d.timeline.every((x) => x.gross === 0)}
      height={300}
    >
      {option && <EChart option={option} height={300} ariaLabel="Выручка gross, возвраты и net" />}
    </ChartCard>
  );
}
