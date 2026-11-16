/** Глобальные слайсеры: период, сравнение, источник, кампания, продукт, менеджер */
import { useMemo } from "react";
import { GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFilterOptions } from "@/hooks/useData";
import { CATEGORY_LABELS } from "@/lib/labels";
import { rangeLabel } from "@/lib/format";
import { previousRange } from "@/lib/period";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/filters";
import type { SourceId } from "@/types/domain";
import { MultiSelect } from "./MultiSelect";
import { PeriodPicker } from "./PeriodPicker";

export function FilterBar() {
  const f = useFilters();
  const opts = useFilterOptions();
  const o = opts.data;

  const sourceName = useMemo(() => new Map(o?.sources.map((s) => [s.id, s.name])), [o]);
  const campaigns = useMemo(
    () =>
      (o?.campaigns ?? [])
        .filter((c) => !f.sourceIds.length || f.sourceIds.includes(c.sourceId))
        .map((c) => ({ id: c.id, name: c.name, group: sourceName.get(c.sourceId) })),
    [o, f.sourceIds, sourceName],
  );
  const products = useMemo(() => (o?.products ?? []).map((p) => ({ id: p.id, name: p.name, group: CATEGORY_LABELS[p.category] })), [o]);
  const prev = previousRange(f);
  const comparing = f.compare === "previous_period";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PeriodPicker />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-9 gap-2 font-semibold", comparing && "border-primary/50 bg-accent text-accent-foreground hover:bg-accent")}
            onClick={() => f.setCompare(comparing ? "none" : "previous_period")}
            aria-pressed={comparing}
          >
            <GitCompareArrows className="size-4" />
            Сравнение
          </Button>
        </TooltipTrigger>
        <TooltipContent>{comparing ? `Сравниваем с периодом ${rangeLabel(prev.from, prev.to)}` : "Включить сравнение с прошлым периодом"}</TooltipContent>
      </Tooltip>

      <div className="mx-1 hidden h-6 w-px bg-border md:block" />

      <MultiSelect
        label="Источник"
        loading={opts.isLoading}
        options={(o?.sources ?? []).map((s) => ({ id: s.id, name: s.name, group: s.isPaid ? "Платные" : "Бесплатные" }))}
        selected={f.sourceIds}
        onChange={(ids) => f.setList("sourceIds", ids as SourceId[])}
      />
      <MultiSelect label="Кампания" loading={opts.isLoading} options={campaigns} selected={f.campaignIds} onChange={(ids) => f.setList("campaignIds", ids)} />
      <MultiSelect label="Продукт" loading={opts.isLoading} options={products} selected={f.productIds} onChange={(ids) => f.setList("productIds", ids)} />
      <MultiSelect
        label="Менеджер"
        loading={opts.isLoading}
        options={(o?.managers ?? []).map((m) => ({ id: m.id, name: m.name }))}
        selected={f.managerIds}
        onChange={(ids) => f.setList("managerIds", ids)}
      />
    </div>
  );
}
