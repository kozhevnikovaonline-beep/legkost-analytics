/** Переключатель модели атрибуции: влияет на лиды, продажи и выручку по источникам */
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MetricTooltip } from "@/components/widgets/MetricTooltip";
import { useFilters } from "@/store/filters";
import type { Attribution } from "@/types/filters";

const MODELS: { id: Attribution; label: string }[] = [
  { id: "first_click", label: "Первый клик" },
  { id: "last_click", label: "Последний клик" },
  { id: "linear", label: "Линейная" },
];

export function AttributionSwitch() {
  const value = useFilters((s) => s.attribution);
  const set = useFilters((s) => s.setAttribution);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-muted-foreground">Атрибуция</span>
      <MetricTooltip
        title="Модель атрибуции"
        formula="Как делить лида и выручку между касаниями клиента: всё первому переходу, всё последнему перед стартом бота или поровну между всеми. Расход от модели не зависит."
      />
      <ToggleGroup type="single" variant="outline" size="sm" value={value} onValueChange={(v) => v && set(v as Attribution)} aria-label="Модель атрибуции">
        {MODELS.map((m) => (
          <ToggleGroupItem key={m.id} value={m.id} className="h-9 px-3 font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
