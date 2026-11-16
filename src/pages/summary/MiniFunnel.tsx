/** Мини-воронка: клик по шагу фильтрует всю страницу (кросс-фильтр «дошли до шага») */
import { Link } from "react-router";
import { ChartCard } from "@/components/widgets/ChartCard";
import { Button } from "@/components/ui/button";
import { useFunnel } from "@/hooks/useData";
import { FUNNEL_LABELS } from "@/lib/labels";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/filters";
import type { FunnelStep } from "@/types/domain";

const SHOWN: FunnelStep[] = ["click", "bot_start", "webapp_open", "lead", "lesson_3", "order", "payment", "repeat_payment"];

export function MiniFunnel({ className }: { className?: string }) {
  const q = useFunnel();
  const active = useFilters((s) => s.funnelStep);
  const setStep = useFilters((s) => s.setFunnelStep);
  const steps = q.data?.steps.filter((s) => SHOWN.includes(s.step)) ?? [];
  const first = steps[0]?.count ?? 0;

  return (
    <ChartCard
      className={className}
      title="Воронка"
      hint="Когорта: пришли по рекламе или посту за период и дальше прошли путь за любое время. Клик по шагу — оставить на странице только тех, кто до него дошёл."
      subtitle="Клик по шагу фильтрует страницу"
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && first === 0}
      height={300}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/funnel">Подробнее</Link>
        </Button>
      }
    >
      <ol className="flex flex-col gap-1.5">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1]!.count : null;
          const share = first ? s.count / first : 0;
          const on = active === s.step;
          return (
            <li key={s.step}>
              <button
                type="button"
                onClick={() => setStep(on ? null : s.step)}
                aria-pressed={on}
                className={cn("group relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted", on && "ring-2 ring-primary")}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-lg bg-primary/14 transition-[width] group-hover:bg-primary/20"
                  style={{ width: `${Math.max(share * 100, 1.5)}%` }}
                  aria-hidden
                />
                <span className="relative w-32 shrink-0 truncate font-semibold">{FUNNEL_LABELS[s.step]}</span>
                <span className="relative flex-1 font-display text-[13px] font-bold tabular-nums">{num(s.count)}</span>
                <span className="relative w-16 text-right text-xs font-semibold text-muted-foreground tabular-nums">{prev === null ? "100%" : pct(prev ? s.count / prev : null)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </ChartCard>
  );
}
