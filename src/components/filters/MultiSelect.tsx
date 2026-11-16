/** Слайсер с множественным выбором и поиском (Popover + Command) */
import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SelectOption {
  id: string;
  name: string;
  /** Группа в списке (например, источник для кампаний) */
  group?: string;
}

interface Props {
  label: string;
  options: SelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  /** Подсказка, когда список пуст */
  emptyText?: string;
}

export function MultiSelect({ label, options, selected, onChange, loading, emptyText = "Ничего не найдено" }: Props) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const map = new Map<string, SelectOption[]>();
    for (const o of options) map.set(o.group ?? "", [...(map.get(o.group ?? "") ?? []), o]);
    return [...map.entries()];
  }, [options]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const first = selected.length === 1 ? options.find((o) => o.id === selected[0])?.name : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading} className={cn("h-9 max-w-[220px] justify-between gap-2 font-semibold", selected.length > 0 && "border-primary/50 bg-accent text-accent-foreground hover:bg-accent")}>
          <span className="truncate">
            {label}
            {first ? `: ${first}` : ""}
          </span>
          {selected.length > 1 && <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">{selected.length}</span>}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск…" />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map(([group, items]) => (
              <CommandGroup key={group || "all"} heading={group || undefined}>
                {items.map((o) => {
                  const on = selected.includes(o.id);
                  return (
                    <CommandItem key={o.id} value={`${o.name} ${o.group ?? ""}`} onSelect={() => toggle(o.id)}>
                      <span className={cn("flex size-4 items-center justify-center rounded-[4px] border border-input", on && "border-primary bg-primary text-primary-foreground")}>
                        {on && <Check className="size-3 text-current" />}
                      </span>
                      <span className="truncate">{o.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
          {selected.length > 0 && (
            <>
              <CommandSeparator />
              <div className="flex justify-between p-1.5">
                <Button variant="ghost" size="sm" onClick={() => onChange([])}>
                  Сбросить
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Готово
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
