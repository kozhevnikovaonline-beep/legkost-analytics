/** Где остановились: застряли на шаге сейчас и сколько вернули дожимы */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useStalls } from "@/hooks/useData";
import { FUNNEL_LABELS } from "@/lib/labels";
import { num, pct } from "@/lib/format";

export function StallsChart({ className }: { className?: string }) {
  const q = useStalls();
  const p = usePalette();
  const option = useMemo<EChartsOption | null>(() => {
    const rows = q.data?.steps ? [...q.data.steps].reverse() : null;
    if (!rows) return null;
    return {
      ...baseOption(p),
      grid: { left: 8, right: 16, top: 30, bottom: 4, containLabel: true },
      tooltip: {
        ...(baseOption(p).tooltip as object),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const r = rows[(params as { dataIndex: number }[])[0]?.dataIndex ?? 0]!;
          return `<b>После «${FUNNEL_LABELS[r.step]}»</b><br/>Дошли: ${num(r.reached)}<br/>Застряли: <b>${num(r.stuck)}</b> (${pct(r.reached ? r.stuck / r.reached : null)})<br/>Получили дожимы: ${num(r.nurtured)}<br/>Вернули дожимы: <b>${num(r.returned)}</b>`;
        },
      },
      xAxis: { type: "value", ...axisStyle(p) },
      yAxis: { type: "category", data: rows.map((r) => `после «${FUNNEL_LABELS[r.step]}»`), ...axisStyle(p), splitLine: { show: false }, axisLabel: { color: p.fg, fontSize: 12 } },
      series: [
        { name: "Застряли сейчас", type: "bar", data: rows.map((r) => r.stuck), itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 },
        { name: "Вернули дожимы", type: "bar", data: rows.map((r) => r.returned), itemStyle: { color: p.series[1], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 },
      ],
    };
  }, [q.data, p]);

  return (
    <ChartCard
      className={className}
      title="Где остановились"
      hint="Застряли — дошли до шага, но не до следующего. Вернули дожимы — клиенты, которые после дожимного поста этого шага перешли дальше (≤ 72 ч)."
      loading={q.isLoading}
      error={q.error}
      height={280}
    >
      {option && <EChart option={option} height={280} ariaLabel="Где остановились клиенты и сколько вернули дожимы" />}
    </ChartCard>
  );
}
