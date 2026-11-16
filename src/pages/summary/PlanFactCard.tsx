/** План / факт за месяц окончания периода + история выручки по месяцам */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { usePlanFact } from "@/hooks/useData";
import { metricValue, pct, rub } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlanMetric } from "@/types/domain";

const LABELS: Record<PlanMetric, string> = { revenue: "Выручка", leads: "Лиды", sales: "Продажи" };
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const monthLabel = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1] ?? m;
const MONTHS_FULL = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

export function PlanFactCard({ className }: { className?: string }) {
  const q = usePlanFact();
  const p = usePalette();
  const d = q.data;
  const elapsed = d ? d.daysPassed / d.daysInMonth : 0;

  const option = useMemo<EChartsOption | null>(() => {
    if (!d) return null;
    return {
      ...baseOption(p),
      grid: { left: 4, right: 4, top: 26, bottom: 4, containLabel: true },
      tooltip: { ...(baseOption(p).tooltip as object), trigger: "axis", valueFormatter: (v) => rub(typeof v === "number" ? v : null) },
      xAxis: { type: "category", data: d.history.map((h) => monthLabel(h.month)), ...axisStyle(p), splitLine: { show: false } },
      yAxis: { type: "value", ...axisStyle(p), axisLabel: { show: false } },
      series: [
        { name: "План", type: "bar", data: d.history.map((h) => h.plan), itemStyle: { color: p.border, borderRadius: [3, 3, 0, 0] }, barGap: "-100%", barMaxWidth: 22 },
        { name: "Факт", type: "bar", data: d.history.map((h) => ({ value: h.fact, itemStyle: { color: h.fact >= h.plan ? p.series[1] : p.series[0] } })), itemStyle: { borderRadius: [3, 3, 0, 0] }, barMaxWidth: 12 },
      ],
    };
  }, [d, p]);

  return (
    <ChartCard
      className={className}
      title="План / факт"
      hint="План месяца = темп прошлого месяца × 1,08. Прогноз — факт с начала месяца, растянутый на весь месяц при текущем темпе. Считается по всей школе, без фильтров."
      subtitle={d ? `${MONTHS_FULL[Number(d.month.slice(5, 7)) - 1]} ${d.month.slice(0, 4)} · прошло ${d.daysPassed} из ${d.daysInMonth} дн. · по всей школе` : undefined}
      loading={q.isLoading}
      error={q.error}
      height={300}
    >
      {d && (
        <div className="flex flex-col gap-4">
          {d.rows.map((r) => {
            const format = r.metric === "revenue" ? "rub" : "number";
            const ahead = (r.progress ?? 0) >= elapsed;
            return (
              <div key={r.metric}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{LABELS[r.metric]}</span>
                  <span className="tabular-nums">
                    <b className="font-display">{metricValue(r.fact, format)}</b>
                    <span className="text-muted-foreground"> / {metricValue(r.plan, format)}</span>
                  </span>
                </div>
                <div className="relative h-2.5 rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", ahead ? "bg-lime-ink" : "bg-primary")} style={{ width: `${Math.min(100, (r.progress ?? 0) * 100)}%` }} />
                  <div className="absolute -top-1 h-4.5 w-0.5 rounded bg-foreground/50" style={{ left: `${elapsed * 100}%` }} title="Сколько месяца прошло" />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{pct(r.progress)} плана</span>
                  <span>Прогноз: {metricValue(r.forecast, format)}</span>
                </div>
              </div>
            );
          })}
          {option && <EChart option={option} height={120} ariaLabel="Выручка: план и факт по месяцам" />}
        </div>
      )}
    </ChartCard>
  );
}
