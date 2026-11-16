/** KPI-карточка в стиле Power BI: значение, изменение к прошлому периоду, спарклайн, формула */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { METRICS, type MetricKey } from "@/lib/metrics";
import { metricValue, pctSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KpiValue } from "@/types/dto";
import { MetricTooltip } from "./MetricTooltip";
import { Sparkline } from "./Sparkline";

export function KpiCard({ metric, data, loading }: { metric: MetricKey; data?: KpiValue; loading?: boolean }) {
  const def = METRICS[metric];
  if (loading || !data) {
    return (
      <Card className="gap-2 px-4 py-3.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-full" />
      </Card>
    );
  }
  const ch = data.change;
  const good = ch === null || ch === 0 ? null : (ch > 0) === (def.better === "up");
  const Arrow = ch === null || ch === 0 ? Minus : ch > 0 ? ArrowUpRight : ArrowDownRight;
  const negativeValue = data.value !== null && data.value < 0;

  return (
    <Card className="gap-1.5 px-4 py-3.5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
        <span className="truncate">{def.label}</span>
        <MetricTooltip title={def.label} formula={def.formula} />
      </div>
      <div className={cn("font-display text-[22px] font-bold leading-tight tracking-tight", negativeValue && "text-negative")}>{metricValue(data.value, def.format)}</div>
      <div className="flex items-end justify-between gap-2">
        {data.prev !== null || ch !== null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold",
                  good === null && "bg-muted text-muted-foreground",
                  good === true && "bg-positive/12 text-positive",
                  good === false && "bg-negative/12 text-negative",
                )}
              >
                <Arrow className="size-3.5" />
                {ch === null ? "нет данных" : pctSigned(ch)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Прошлый период: {metricValue(data.prev, def.format)}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted-foreground">без сравнения</span>
        )}
        <div className="w-24">
          <Sparkline values={data.spark} color={good === false ? "var(--negative)" : "var(--chart-1)"} />
        </div>
      </div>
    </Card>
  );
}
