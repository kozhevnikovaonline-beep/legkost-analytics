/** Дожимные посты по шагам воронки: отправлено, клики, перешли дальше, заблокировали */
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, ThumbsDown, ThumbsUp } from "lucide-react";
import { ChartCard } from "@/components/widgets/ChartCard";
import { DataTable, type ColumnMeta } from "@/components/widgets/DataTable";
import { useStalls } from "@/hooks/useData";
import type { ExportColumn } from "@/lib/export";
import { duration, num, pct } from "@/lib/format";
import { FUNNEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { NurtureRow, StallRow } from "@/types/dto";

/** Строка дерева: шаг (с постами внутри) или сам пост */
type Row = { kind: "step"; step: StallRow; children: Row[] } | { kind: "post"; step: StallRow; post: NurtureRow };

const val = (r: Row, k: "sent" | "clicked" | "converted" | "blocked" | "ctr" | "cr") => (r.kind === "step" ? r.step[k] : r.post[k]);

function numCol(id: string, header: string, get: (r: Row) => number | null, fmt: (v: number | null) => string): ColumnDef<Row> {
  return {
    id,
    accessorFn: (r) => get(r) ?? Number.NEGATIVE_INFINITY,
    header,
    cell: ({ row }) => fmt(get(row.original)),
    sortDescFirst: true,
    meta: { align: "right" } satisfies ColumnMeta,
  };
}

export function NurtureTable() {
  const q = useStalls();
  const rows = useMemo<Row[]>(() => (q.data?.steps ?? []).map((s) => ({ kind: "step", step: s, children: s.messages.map((post) => ({ kind: "post", step: s, post })) })), [q.data]);

  // Лучший и худший пост по CR (среди постов с заметным числом отправок)
  const { best, worst } = useMemo(() => {
    const posts = (q.data?.steps ?? []).flatMap((s) => s.messages).filter((m) => m.sent >= 30 && m.cr !== null);
    const sorted = [...posts].sort((a, b) => b.cr! - a.cr!);
    return { best: sorted[0]?.id, worst: sorted.at(-1)?.id };
  }, [q.data]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "name",
        header: "Шаг / дожимный пост",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          if (r.kind === "step") {
            return (
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => row.toggleExpanded()} className="grid size-6 place-items-center rounded hover:bg-muted" aria-label={row.getIsExpanded() ? "Свернуть" : "Развернуть"}>
                  <ChevronRight className={cn("size-4 transition-transform", row.getIsExpanded() && "rotate-90")} />
                </button>
                После «{FUNNEL_LABELS[r.step.step]}» → «{FUNNEL_LABELS[r.step.next]}»
              </div>
            );
          }
          const isBest = r.post.id === best;
          const isWorst = r.post.id === worst;
          return (
            <div className="flex items-center gap-2 pl-8">
              <span className="text-muted-foreground">{r.post.order}.</span>
              <span className="max-w-72 truncate" title={r.post.title}>
                «{r.post.title}»
              </span>
              {isBest && (
                <span className="inline-flex items-center gap-1 rounded-full bg-positive/12 px-2 py-0.5 text-[11px] font-bold text-positive">
                  <ThumbsUp className="size-3" /> лучший
                </span>
              )}
              {isWorst && (
                <span className="inline-flex items-center gap-1 rounded-full bg-negative/12 px-2 py-0.5 text-[11px] font-bold text-negative">
                  <ThumbsDown className="size-3" /> слабый
                </span>
              )}
            </div>
          );
        },
      },
      numCol("stuck", "Застряли", (r) => (r.kind === "step" ? r.step.stuck : null), (v) => (v === null ? "" : num(v))),
      { id: "delay", header: "Через", enableSorting: false, cell: ({ row }) => (row.original.kind === "post" ? duration(row.original.post.delayMinutes) : ""), meta: { align: "right" } satisfies ColumnMeta },
      numCol("sent", "Отправлено", (r) => val(r, "sent"), num),
      numCol("clicked", "Клики", (r) => val(r, "clicked"), num),
      numCol("ctr", "CTR поста", (r) => val(r, "ctr"), pct),
      numCol("converted", "Перешли дальше", (r) => val(r, "converted"), num),
      numCol("cr", "CR поста", (r) => val(r, "cr"), pct),
      numCol("blocked", "Заблокировали", (r) => val(r, "blocked"), num),
    ],
    [best, worst],
  );

  const exportColumns = useMemo<ExportColumn<Row & { __depth: number }>[]>(
    () => [
      { header: "Шаг", value: (r) => `После «${FUNNEL_LABELS[r.step.step]}»`, width: 24 },
      { header: "Пост", value: (r) => (r.kind === "post" ? r.post.title : "Все посты шага"), width: 36 },
      { header: "Через, ч", value: (r) => (r.kind === "post" ? r.post.delayMinutes / 60 : null), numFmt: "0.0" },
      { header: "Застряли", value: (r) => (r.kind === "step" ? r.step.stuck : null), numFmt: "#,##0" },
      { header: "Отправлено", value: (r) => val(r, "sent"), numFmt: "#,##0" },
      { header: "Клики", value: (r) => val(r, "clicked"), numFmt: "#,##0" },
      { header: "CTR поста", value: (r) => val(r, "ctr"), numFmt: "0.0%" },
      { header: "Перешли дальше", value: (r) => val(r, "converted"), numFmt: "#,##0" },
      { header: "CR поста", value: (r) => val(r, "cr"), numFmt: "0.0%" },
      { header: "Заблокировали", value: (r) => val(r, "blocked"), numFmt: "#,##0" },
    ],
    [],
  );

  return (
    <ChartCard
      title="Дожимные посты бота"
      hint="Посты, которые бот отправляет тем, кто остановился на шаге. CTR поста = клики по кнопке / отправлено. CR поста = перешли на следующий шаг ≤ 72 ч после поста / отправлено. Telegram не сообщает ботам о прочтении, поэтому вместо «прочитано» считаем клики и переходы на следующий шаг."
      subtitle="Раскройте шаг, чтобы увидеть посты серии"
      loading={q.isLoading}
      error={q.error}
      height={360}
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => (r.kind === "step" ? r.step.step : r.post.id)}
        getSubRows={(r) => (r.kind === "step" ? r.children : undefined)}
        exportName="nurture-posts"
        exportColumns={exportColumns}
        maxHeight={620}
      />
    </ChartCard>
  );
}
