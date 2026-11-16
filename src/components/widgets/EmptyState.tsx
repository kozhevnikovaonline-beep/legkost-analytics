import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Пустое состояние: нет данных под выбранные фильтры, раздел в разработке и т. п. */
export function EmptyState({ icon: Icon = Inbox, title, text, action, className }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </div>
      <div className="font-display text-base font-bold">{title}</div>
      {text && <p className="max-w-md text-sm text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}
