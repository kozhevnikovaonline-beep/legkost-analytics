/** Полная воронка: количество, CR к предыдущему и первому шагу, потери, время между шагами */
import { TrendingDown } from "lucide-react";
import { ChartCard } from "@/components/widgets/ChartCard";
import { useFunnel } from "@/hooks/useData";
import { duration, num, pct } from "@/lib/format";
import { FUNNEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/filters";

export function FunnelSteps() {
  const q = useFunnel();
  const active = useFilters((s) => s.funnelStep);
  const setStep = useFilters((s) => s.setFunnelStep);
  const steps = q.data?.steps ?? [];
  const first = steps[0]?.count ?? 0;
  const maxLost = Math.max(0, ...steps.slice(2).map((s) => s.lost));

  return (
    <ChartCard
      title="Воронка от клика до повторной оплаты"
      hint="Когорта: пришли по рекламе, посту или ссылке за период; дальше — их путь за любое время. CR к пред. = шаг / предыдущий шаг; CR от клика = шаг / клики. Время — медиана от предыдущего шага. Клик по строке — оставить на всех страницах только дошедших до шага."
      subtitle="Клик по шагу фильтрует все страницы"
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && first === 0}
      height={420}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[150px_1fr_80px_80px_80px_90px_80px] gap-3 border-b px-2.5 pb-2 text-xs font-bold text-muted-foreground">
            <span>Шаг</span>
            <span />
            <span className="text-right">Клиентов</span>
            <span className="text-right">CR к пред.</span>
            <span className="text-right">CR от клика</span>
            <span className="text-right">Потеряли</span>
            <span className="text-right">Время</span>
          </div>
          <ol className="flex flex-col gap-1 pt-1.5">
            {steps.map((s, i) => {
              const share = first ? s.count / first : 0;
              const on = active === s.step;
              const worst = i > 1 && s.lost === maxLost && maxLost > 0;
              return (
                <li key={s.step}>
                  <button
                    type="button"
                    onClick={() => setStep(on ? null : s.step)}
                    aria-pressed={on}
                    className={cn("grid w-full grid-cols-[150px_1fr_80px_80px_80px_90px_80px] items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted", on && "bg-accent ring-2 ring-primary")}
                  >
                    <span className="truncate font-semibold">{FUNNEL_LABELS[s.step]}</span>
                    <span className="relative h-5 rounded bg-muted">
                      <span className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-3)]" style={{ width: `${Math.max(share * 100, 0.8)}%` }} />
                    </span>
                    <span className="text-right font-display font-bold tabular-nums">{num(s.count)}</span>
                    <span className="text-right tabular-nums">{i === 0 ? "—" : pct(s.crPrev)}</span>
                    <span className="text-right tabular-nums text-muted-foreground">{i === 0 ? "100%" : pct(s.crFirst)}</span>
                    <span className={cn("flex items-center justify-end gap-1 tabular-nums", worst && "font-bold text-negative")}>
                      {worst && <TrendingDown className="size-3.5" />}
                      {i === 0 ? "—" : `−${num(s.lost)}`}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground">{duration(s.medianMinutes)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {maxLost > 0 && <p className="mt-3 px-2.5 text-xs text-muted-foreground">Красным — самый большой отвал после старта бота: на этот шаг стоит направить дожимы в первую очередь.</p>}
        </div>
      </div>
    </ChartCard>
  );
}
