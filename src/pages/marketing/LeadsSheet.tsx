/** Drill-down: лиды объявления → карточка клиента */
import { useNavigate } from "react-router";
import { ChevronRight, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/widgets/EmptyState";
import { useLeadsByAd } from "@/hooks/useData";
import { dateTime, num, pct, rub } from "@/lib/format";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TrafficRow } from "@/types/dto";
import type { LeadStatus } from "@/types/domain";

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-muted text-muted-foreground",
  warming: "bg-chart-4/15 text-chart-4",
  offer_sent: "bg-accent text-accent-foreground",
  won: "bg-positive/15 text-positive",
  lost: "bg-negative/12 text-negative",
};

export function LeadsSheet({ ad, onClose }: { ad: TrafficRow | null; onClose: () => void }) {
  const q = useLeadsByAd(ad?.adId ?? null);
  const navigate = useNavigate();
  const rows = q.data ?? [];
  const won = rows.filter((r) => r.status === "won").length;

  return (
    <Sheet open={!!ad} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display">Лиды объявления</SheetTitle>
          <SheetDescription>
            «{ad?.name}» · {q.data ? `${num(rows.length)} лидов, купили ${num(won)}` : "загрузка…"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto p-2">
          {q.isLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={UserX} title="Лидов нет" text="За выбранный период по этому объявлению лидов не было." className="m-2" />
          ) : (
            <ul className="flex flex-col">
              {rows.map((r) => (
                <li key={r.leadId}>
                  <button type="button" onClick={() => navigate(`/clients/${r.userId}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{r.name[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {r.name} {r.username && <span className="font-normal text-muted-foreground">@{r.username}</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {dateTime(r.createdAt)}
                        {r.weight < 0.999 && ` · доля ${pct(r.weight)}`}
                        {r.ltv > 0 && ` · LTV ${rub(r.ltv)}`}
                      </span>
                    </span>
                    <Badge className={cn("border-0", STATUS_STYLE[r.status])}>{LEAD_STATUS_LABELS[r.status]}</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
