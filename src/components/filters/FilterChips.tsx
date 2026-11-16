/** Активные фильтры чипами: каждый можно снять, «Сбросить всё» — вернуть исходный срез */
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFilterOptions } from "@/hooks/useData";
import { FUNNEL_LABELS } from "@/lib/labels";
import { activeCount, type ListKey, useFilters } from "@/store/filters";

const KEY_LABELS: Record<ListKey, string> = {
  sourceIds: "Источник",
  campaignIds: "Кампания",
  adIds: "Объявление",
  productIds: "Продукт",
  managerIds: "Менеджер",
};

export function FilterChips() {
  const f = useFilters();
  const o = useFilterOptions().data;
  if (activeCount(f) === 0) return null;

  const names: Record<ListKey, Map<string, string>> = {
    sourceIds: new Map(o?.sources.map((x) => [x.id, x.name])),
    campaignIds: new Map(o?.campaigns.map((x) => [x.id, x.name])),
    adIds: new Map(o?.ads.map((x) => [x.id, x.name])),
    productIds: new Map(o?.products.map((x) => [x.id, x.name])),
    managerIds: new Map(o?.managers.map((x) => [x.id, x.name])),
  };

  const chips = (Object.keys(KEY_LABELS) as ListKey[]).flatMap((key) =>
    (f[key] as string[]).map((id) => ({ key, id, label: `${KEY_LABELS[key]}: ${names[key].get(id) ?? id}` })),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Активные фильтры">
      {chips.map((c) => (
        <Chip key={`${c.key}:${c.id}`} label={c.label} onRemove={() => f.toggle(c.key, c.id)} />
      ))}
      {f.funnelStep && <Chip label={`Шаг воронки: ${FUNNEL_LABELS[f.funnelStep]}`} onRemove={() => f.setFunnelStep(null)} />}
      <Button variant="link" size="sm" className="h-7 px-2 text-xs" onClick={() => f.reset()}>
        Сбросить всё
      </Button>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent py-0.5 pl-3 pr-1 text-xs font-semibold text-accent-foreground">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-primary/15" aria-label={`Убрать фильтр ${label}`}>
        <X className="size-3.5" />
      </button>
    </span>
  );
}
