/** Карточка графика: заголовок, подсказка, действия, скелетон, пустое состояние и ошибка */
import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { MetricTooltip } from "./MetricTooltip";

interface Props {
  title: string;
  /** Что показывает виджет и как считается (тултип) */
  hint?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  /** Высота области содержимого для скелетона */
  height?: number;
  className?: string;
  children?: ReactNode;
}

export function ChartCard({ title, hint, subtitle, actions, loading, error, empty, height = 280, className, children }: Props) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <CardTitle className="font-display flex items-center gap-1.5 text-[15px] font-bold">
            {title}
            {hint && <MetricTooltip title={title} formula={hint} />}
          </CardTitle>
          {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="px-5">
        {loading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : error ? (
          <EmptyState icon={AlertTriangle} title="Не удалось загрузить данные" text={error instanceof Error ? error.message : "Попробуйте обновить страницу"} className="border-destructive/40" />
        ) : empty ? (
          <EmptyState icon={SearchX} title="Нет данных" text="Под выбранные фильтры ничего не нашлось. Измените период или снимите часть фильтров." />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
