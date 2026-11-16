/** Период: пресеты (сегодня / 7 / 30 / 90 дней) и свой диапазон в календаре */
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMeta } from "@/hooks/useData";
import { rangeLabel } from "@/lib/format";
import { PRESETS } from "@/lib/period";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/filters";
import type { ISODate } from "@/types/domain";

const toDate = (d: ISODate) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const toIso = (d: Date): ISODate => format(d, "yyyy-MM-dd");

export function PeriodPicker() {
  const { preset, from, to, setPreset, setRange } = useFilters();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={preset === "custom" ? "" : preset}
        onValueChange={(v) => {
          const p = PRESETS.find((x) => x.id === v);
          if (p) setPreset(p.id);
        }}
        aria-label="Период"
      >
        {PRESETS.map((p) => (
          <ToggleGroupItem key={p.id} value={p.id} className="h-9 px-3 font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setDraft({ from: toDate(from), to: toDate(to) });
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-9 gap-2 font-semibold", preset === "custom" && "border-primary/50 bg-accent text-accent-foreground hover:bg-accent")}>
            <CalendarDays className="size-4" />
            {rangeLabel(from, to)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            locale={ru}
            numberOfMonths={2}
            defaultMonth={draft?.to ? subMonths(draft.to, 1) : undefined}
            selected={draft}
            onSelect={setDraft}
            disabled={meta.data ? { before: toDate(meta.data.startDate), after: toDate(meta.data.endDate) } : undefined}
          />
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <span className="text-xs text-muted-foreground">{draft?.from && draft.to ? rangeLabel(toIso(draft.from), toIso(draft.to)) : "Выберите начало и конец"}</span>
            <Button
              size="sm"
              disabled={!draft?.from || !draft.to}
              onClick={() => {
                if (draft?.from && draft.to) setRange(toIso(draft.from), toIso(draft.to));
                setOpen(false);
              }}
            >
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
