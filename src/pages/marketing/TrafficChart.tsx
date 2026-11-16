/** Клики и лиды по дням + CPL на второй оси */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useDailyTraffic } from "@/hooks/useData";
import { day, num, rub } from "@/lib/format";
import { cpl } from "@/lib/metrics";

export function TrafficChart({ className }: { className?: string }) {
  const q = useDailyTraffic();
  const p = usePalette();
  const option = useMemo<EChartsOption | null>(() => {
    const d = q.data;
    if (!d) return null;
    return {
      ...baseOption(p),
      grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
      tooltip: {
        ...(baseOption(p).tooltip as object),
        trigger: "axis",
        formatter: (params: unknown) => {
          const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0;
          const x = d[i]!;
          return `<b>${day(x.date)}</b><br/>Клики: ${num(x.clicks)}<br/>Лиды: ${num(x.leads)}<br/>Расход: ${rub(x.spend)}<br/>CPL: ${rub(cpl(x.spend, x.leads))}`;
        },
      },
      xAxis: { type: "category", data: d.map((x) => day(x.date)), ...axisStyle(p), splitLine: { show: false } },
      yAxis: [
        { type: "value", ...axisStyle(p) },
        { type: "value", ...axisStyle(p), splitLine: { show: false }, axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => rub(v, true) } },
      ],
      series: [
        { name: "Клики", type: "bar", data: d.map((x) => x.clicks), itemStyle: { color: p.series[2], opacity: 0.7, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 14 },
        { name: "Лиды", type: "bar", data: d.map((x) => x.leads), itemStyle: { color: p.series[0], borderRadius: [3, 3, 0, 0] }, barMaxWidth: 14 },
        { name: "CPL", type: "line", yAxisIndex: 1, data: d.map((x) => cpl(x.spend, x.leads)), smooth: 0.3, smoothMonotone: "x", showSymbol: false, lineStyle: { width: 2, color: p.series[1] }, itemStyle: { color: p.series[1] } },
      ],
    };
  }, [q.data, p]);

  return (
    <ChartCard
      className={className}
      title="Клики, лиды и CPL по дням"
      hint="Клики — все переходы с меткой (реклама, посевы, органика, рефералы). Лиды — прошли приветствие в Web App. CPL = расход дня / лиды дня (правая ось)."
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && q.data.every((x) => x.clicks === 0)}
      height={260}
    >
      {option && <EChart option={option} height={260} ariaLabel="Клики, лиды и CPL по дням" />}
    </ChartCard>
  );
}
