import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/domain";

const STYLE: Record<LeadStatus, string> = {
  new: "bg-muted text-muted-foreground",
  warming: "bg-chart-4/15 text-chart-4",
  offer_sent: "bg-accent text-accent-foreground",
  won: "bg-positive/15 text-positive",
  lost: "bg-negative/12 text-negative",
};

/** Статус лида цветным бейджем; null — ещё не стала лидом */
export function StatusBadge({ status, className }: { status: LeadStatus | null; className?: string }) {
  if (!status)
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Не лид
      </Badge>
    );
  return <Badge className={cn("border-0", STYLE[status], className)}>{LEAD_STATUS_LABELS[status]}</Badge>;
}
