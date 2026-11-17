/** Страница «Клиенты»: таблица с поиском, фильтрами, сортировкой, страницами и экспортом */
import { useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search, Tag, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartCard } from "@/components/widgets/ChartCard";
import { EmptyState } from "@/components/widgets/EmptyState";
import { MetricTooltip } from "@/components/widgets/MetricTooltip";
import { StatusBadge } from "@/components/widgets/StatusBadge";
import { dataSource } from "@/data";
import { useClients, useCurrentFilters } from "@/hooks/useData";
import { exportCsv, exportXlsx, type ExportColumn } from "@/lib/export";
import { dateTime, num, rub } from "@/lib/format";
import { FUNNEL_LABELS, LEAD_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ClientQuery, ClientRow, ClientSort } from "@/types/dto";
import type { LeadStatus } from "@/types/domain";

const PAGE_SIZE = 50;
const STATUSES: (LeadStatus | "no_lead")[] = ["new", "warming", "offer_sent", "won", "lost", "no_lead"];

function Stat({ label, value, hint, loading }: { label: string; value: string; hint: string; loading: boolean }) {
  return (
    <Card className="gap-1 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
        {label}
        <MetricTooltip title={label} formula={hint} />
      </div>
      {loading ? <Skeleton className="h-7 w-24" /> : <div className="font-display text-[22px] font-bold leading-tight whitespace-nowrap">{value}</div>}
    </Card>
  );
}

const EXPORT_COLUMNS: ExportColumn<ClientRow>[] = [
  { header: "ID", value: (r) => r.userId, width: 12 },
  { header: "Имя", value: (r) => r.name, width: 14 },
  { header: "Telegram", value: (r) => (r.username ? `@${r.username}` : ""), width: 18 },
  { header: "Пришла", value: (r) => dateTime(r.createdAt), width: 18 },
  { header: "Источник", value: (r) => r.sourceName ?? "", width: 20 },
  { header: "Кампания", value: (r) => r.campaignName ?? "", width: 28 },
  { header: "Этап воронки", value: (r) => FUNNEL_LABELS[r.step], width: 16 },
  { header: "Статус", value: (r) => (r.status ? LEAD_STATUS_LABELS[r.status] : "Не лид") },
  { header: "Покупок", value: (r) => r.orders },
  { header: "LTV, ₽", value: (r) => r.ltv, numFmt: "#,##0" },
  { header: "Последняя активность", value: (r) => dateTime(r.lastActivityAt), width: 20 },
  { header: "Менеджер", value: (r) => r.managerName ?? "", width: 18 },
  { header: "Теги", value: (r) => r.tags.join(", "), width: 28 },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const filters = useCurrentFilters();
  const [segment, setSegment] = useState<ClientQuery["segment"]>("period");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<ClientQuery["status"]>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [onlyPaying, setOnlyPaying] = useState(false);
  const [sort, setSort] = useState<{ by: ClientSort; desc: boolean }>({ by: "lastActivity", desc: true });
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Любое изменение условий — на первую страницу
  useEffect(() => setPage(0), [segment, deferredSearch, status, tag, onlyPaying, sort, filters]);

  const query: ClientQuery = { segment, search: deferredSearch, status, tag, onlyPaying, sort: sort.by, desc: sort.desc, page, pageSize: PAGE_SIZE };
  const q = useClients(query);
  const d = q.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / PAGE_SIZE)) : 1;

  const doExport = async (kind: "csv" | "xlsx") => {
    setExporting(true);
    try {
      const all = await dataSource.getClients(filters, { ...query, page: 0, pageSize: 100_000 });
      if (kind === "csv") exportCsv("clients", EXPORT_COLUMNS, all.rows);
      else await exportXlsx("clients", "Клиенты", EXPORT_COLUMNS, all.rows);
    } finally {
      setExporting(false);
    }
  };

  const SortHead = ({ by, children, right }: { by: ClientSort; children: string; right?: boolean }) => (
    <th className={cn("border-b px-3 py-2 text-xs font-bold whitespace-nowrap text-muted-foreground", right ? "text-right" : "text-left")}>
      <button type="button" className={cn("inline-flex items-center gap-1 hover:text-foreground", right && "flex-row-reverse")} onClick={() => setSort((s) => ({ by, desc: s.by === by ? !s.desc : true }))}>
        {children}
        {sort.by === by ? sort.desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5 opacity-40" />}
      </button>
    </th>
  );
  const Head = ({ children, right }: { children: string; right?: boolean }) => <th className={cn("border-b px-3 py-2 text-xs font-bold whitespace-nowrap text-muted-foreground", right ? "text-right" : "text-left")}>{children}</th>;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Итоги по клиентам" className="kpi-row">
        <Stat loading={q.isLoading} label="Клиентов" value={num(d?.summary.clients ?? 0)} hint="Пользователи бота под текущие фильтры: сегмент, период, источник, продукт, менеджер, поиск, статус и тег." />
        <Stat loading={q.isLoading} label="Платящих" value={num(d?.summary.paying ?? 0)} hint="Клиенты хотя бы с одной оплаченной покупкой." />
        <Stat loading={q.isLoading} label="LTV платящих, всего" value={rub(d?.summary.ltv ?? 0, (d?.summary.ltv ?? 0) >= 1_000_000)} hint="Сумма выручки платящих клиентов выборки за всё время (net)." />
        <Stat loading={q.isLoading} label="Средний LTV" value={rub(d?.summary.avgLtv ?? null)} hint="LTV платящих / число платящих клиентов выборки." />
      </section>

      <ChartCard title="Клиенты" hint="Клик по строке открывает карточку клиента: касания, события в приложении, дожимные посты, покупки и LTV. Источник — касание с наибольшим весом в выбранной модели атрибуции." height={520}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup type="single" variant="outline" size="sm" value={segment} onValueChange={(v) => v && setSegment(v as ClientQuery["segment"])} aria-label="Сегмент">
              <ToggleGroupItem value="period" className="h-9 px-3 font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Пришли за период
              </ToggleGroupItem>
              <ToggleGroupItem value="all" className="h-9 px-3 font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Все клиенты
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="relative min-w-52 flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 pl-8" placeholder="Имя, @username или ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 font-semibold", status && "border-primary/50 bg-accent text-accent-foreground hover:bg-accent")}>
                  Статус{status ? `: ${status === "no_lead" ? "Не лид" : LEAD_STATUS_LABELS[status]}` : ""}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setStatus(null)}>Все статусы</DropdownMenuItem>
                {STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatus(s)}>
                    <StatusBadge status={s === "no_lead" ? null : s} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 font-semibold", tag && "border-primary/50 bg-accent text-accent-foreground hover:bg-accent")}>
                  <Tag className="size-3.5" />
                  {tag ?? "Тег"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
                <DropdownMenuItem onSelect={() => setTag(null)}>Все теги</DropdownMenuItem>
                {(d?.tags ?? []).map((t) => (
                  <DropdownMenuItem key={t} onSelect={() => setTag(t)}>
                    {t}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" aria-pressed={onlyPaying} onClick={() => setOnlyPaying((v) => !v)} className={cn("h-9 font-semibold", onlyPaying && "border-primary/50 bg-accent text-accent-foreground hover:bg-accent")}>
              Только платящие
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto h-9 gap-2 font-semibold" disabled={exporting || !d?.total}>
                  <Download className="size-4" /> {exporting ? "Готовлю…" : "Экспорт"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void doExport("csv")}>CSV (Excel, Google Таблицы)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void doExport("xlsx")}>XLSX (Excel)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {q.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : !d || d.total === 0 ? (
            <EmptyState icon={UserX} title="Клиентов не нашлось" text="Измените поиск, статус или тег, переключитесь на «Все клиенты» или расширьте период." />
          ) : (
            <>
              <div className={cn("overflow-auto rounded-lg border transition-opacity", q.isFetching && "opacity-60")}>
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95">
                    <tr>
                      <Head>Клиент</Head>
                      <Head>Источник</Head>
                      <SortHead by="createdAt">Пришла</SortHead>
                      <Head>Этап</Head>
                      <Head>Статус</Head>
                      <SortHead by="orders" right>
                        Покупок
                      </SortHead>
                      <SortHead by="ltv" right>
                        LTV
                      </SortHead>
                      <SortHead by="lastActivity">Активность</SortHead>
                      <Head>Менеджер</Head>
                      <Head>Теги</Head>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((r) => (
                      <tr key={r.userId} onClick={() => navigate(`/clients/${r.userId}`)} className="cursor-pointer border-b last:border-0 hover:bg-muted/60">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{r.name[0]}</span>
                            <span className="min-w-0">
                              <span className="block font-semibold whitespace-nowrap">
                                {r.name}
                                {r.blocked && (
                                  <Badge variant="outline" className="ml-1.5 border-negative/40 text-[10px] text-negative">
                                    заблокировала бота
                                  </Badge>
                                )}
                              </span>
                              <span className="block text-xs text-muted-foreground">{r.username ? `@${r.username}` : r.userId}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block whitespace-nowrap">{r.sourceName ?? "—"}</span>
                          <span className="block max-w-48 truncate text-xs text-muted-foreground">{r.campaignName}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{dateTime(r.createdAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{FUNNEL_LABELS[r.step]}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.orders || "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.ltv ? rub(r.ltv) : "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{dateTime(r.lastActivityAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.managerName ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {r.tags.slice(0, 2).map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px] whitespace-nowrap">
                                {t}
                              </Badge>
                            ))}
                            {r.tags.length > 2 && <span className="text-xs text-muted-foreground">+{r.tags.length - 2}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {num(page * PAGE_SIZE + 1)}–{num(Math.min((page + 1) * PAGE_SIZE, d.total))} из {num(d.total)}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Предыдущая страница">
                    <ChevronLeft />
                  </Button>
                  <span className="px-2 tabular-nums">
                    {page + 1} / {pages}
                  </span>
                  <Button variant="outline" size="icon" className="size-8" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Следующая страница">
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
