/** Воронка в разрезе источников: тепловая таблица, клик по строке — фильтр по источнику */
import { useState } from "react";
import { ChartCard } from "@/components/widgets/ChartCard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFunnelBySource } from "@/hooks/useData";
import { num, pct } from "@/lib/format";
import { FUNNEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/filters";
import type { FunnelStep } from "@/types/domain";

const SHOWN: FunnelStep[] = ["click", "bot_start", "webapp_open", "lead", "lesson_1", "lesson_3", "order", "payment", "repeat_payment"];

export function FunnelBySource() {
  const q = useFunnelBySource();
  const [mode, setMode] = useState<"count" | "cr">("cr");
  const selected = useFilters((s) => s.sourceIds);
  const toggle = useFilters((s) => s.toggle);
  const rows = q.data ?? [];

  // Максимум CR по каждому шагу — для интенсивности подсветки
  const maxCr = new Map(SHOWN.map((step) => [step, Math.max(0, ...rows.map((r) => r.steps.find((s) => s.step === step)?.crFirst ?? 0))]));

  return (
    <ChartCard
      title="Воронка по источникам"
      hint="Для каждого источника — своя когорта: пришли из него за период. CR от клика = шаг / клики источника. Чем насыщеннее цвет, тем лучше источник на этом шаге относительно остальных. Клик по строке — фильтр по источнику."
      subtitle="Клик по строке фильтрует страницу"
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && rows.length === 0}
      height={300}
      actions={
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as "count" | "cr")} aria-label="Что показывать">
          <ToggleGroupItem value="cr" className="h-8 px-2.5 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            CR от клика
          </ToggleGroupItem>
          <ToggleGroupItem value="count" className="h-8 px-2.5 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            Количество
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/95">
            <tr>
              <th className="border-b px-3 py-2 text-left text-xs font-bold text-muted-foreground">Источник</th>
              {SHOWN.map((s) => (
                <th key={s} className="border-b px-3 py-2 text-right text-xs font-bold whitespace-nowrap text-muted-foreground">
                  {FUNNEL_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = selected.includes(r.sourceId);
              return (
                <tr key={r.sourceId} onClick={() => toggle("sourceIds", r.sourceId)} className={cn("cursor-pointer border-b last:border-0 hover:bg-muted/60", on && "bg-accent/70")}>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.name}</td>
                  {SHOWN.map((step) => {
                    const c = r.steps.find((s) => s.step === step)!;
                    const max = maxCr.get(step) ?? 0;
                    const heat = step === "click" || !max || c.crFirst === null ? 0 : c.crFirst / max;
                    return (
                      <td key={step} className="px-3 py-2 text-right tabular-nums whitespace-nowrap" style={{ background: heat ? `color-mix(in srgb, var(--chart-1) ${Math.round(heat * 30)}%, transparent)` : undefined }}>
                        {mode === "count" || step === "click" ? num(c.count) : pct(c.crFirst)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
