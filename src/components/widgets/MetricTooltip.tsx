/** Значок «i» с формулой метрики */
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MetricTooltip({ title, formula, children }: { title: string; formula: ReactNode; children?: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:text-primary" aria-label={`Как считается: ${title}`}>
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left leading-relaxed">
        <div className="font-bold">{title}</div>
        <div className="opacity-90">{formula}</div>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
