/** Карточка клиента: профиль, путь по воронке, касания, хронология (события, дожимы, заказы, оплаты), покупки, LTV */
import { Link, useParams } from "react-router";
import { ArrowLeft, Bell, Check, CreditCard, MousePointerClick, ShoppingBag, Sparkles, UserX, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/widgets/EmptyState";
import { StatusBadge } from "@/components/widgets/StatusBadge";
import { useClient } from "@/hooks/useData";
import { dateTime, num, rub } from "@/lib/format";
import { FUNNEL_LABELS, ORDER_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ClientCard, TimelineItem } from "@/types/dto";

const KIND_ICON: Record<TimelineItem["kind"], LucideIcon> = { touch: MousePointerClick, event: Sparkles, nurture: Bell, order: ShoppingBag, payment: CreditCard };
const KIND_LABEL: Record<TimelineItem["kind"], string> = { touch: "Касание", event: "Приложение", nurture: "Дожим", order: "Заказ", payment: "Оплата" };
const TONE: Record<TimelineItem["tone"], string> = {
  positive: "bg-positive/15 text-positive",
  negative: "bg-negative/12 text-negative",
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="gap-1 px-4 py-3.5">
      <div className="text-[13px] font-semibold text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold leading-tight whitespace-nowrap">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function Touch({ label, t }: { label: string; t: ClientCard["firstTouch"] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      {t ? (
        <>
          <div className="mt-1 font-semibold">{t.sourceName}</div>
          <div className="text-sm text-muted-foreground">{[t.campaignName, t.adName].filter(Boolean).join(" · ") || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{dateTime(t.at)}</div>
        </>
      ) : (
        <div className="mt-1 text-sm text-muted-foreground">нет данных</div>
      )}
    </div>
  );
}

export default function ClientCardPage() {
  const { id } = useParams();
  const q = useClient(id);
  const c = q.data;

  if (q.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <div className="kpi-row">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!c) {
    return (
      <EmptyState
        icon={UserX}
        title="Клиент не найден"
        text="Возможно, ссылка устарела. Вернитесь к списку клиентов."
        action={
          <Button asChild>
            <Link to="/clients">К клиентам</Link>
          </Button>
        }
      />
    );
  }

  const r = c.row;
  const reached = c.steps.filter((s) => s.at).length;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" className="w-fit gap-1.5" asChild>
        <Link to="/clients">
          <ArrowLeft className="size-4" /> Все клиенты
        </Link>
      </Button>

      <Card className="bg-hero border-0 px-5 py-5 text-white">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-white/15 font-display text-2xl font-bold">{r.name[0]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold">{r.name}</h2>
              <StatusBadge status={r.status} className="bg-white/90" />
              {r.blocked && <Badge className="border-0 bg-negative text-white">заблокировала бота</Badge>}
            </div>
            <div className="mt-1 text-sm text-white/70">
              {r.username ? `@${r.username} · ` : ""}Telegram ID {c.tgUserId} · {r.userId}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.tags.map((t) => (
                <Badge key={t} className="border-0 bg-white/12 text-white">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-right text-sm text-white/75">
            <div>Менеджер</div>
            <div className="font-semibold text-white">{r.managerName ?? "не назначен"}</div>
          </div>
        </div>
      </Card>

      <section className="kpi-row">
        <Stat label="LTV" value={rub(r.ltv)} sub="выручка за всё время (net)" />
        <Stat label="Покупок" value={num(r.orders)} sub={c.firstPaidAt ? `первая — ${dateTime(c.firstPaidAt)}` : "ещё не покупала"} />
        <Stat label="Этап воронки" value={FUNNEL_LABELS[r.step]} sub={`пройдено ${reached} из ${c.steps.length} шагов`} />
        <Stat label="Дожимы" value={`${num(c.nurture.converted)} из ${num(c.nurture.sent)}`} sub={`продвинулась дальше после дожимов · кликов ${num(c.nurture.clicked)}`} />
      </section>

      <Card className="gap-3 py-4">
        <CardHeader className="px-5">
          <CardTitle className="font-display text-[15px] font-bold">Путь по воронке</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
            {c.steps.map((s) => (
              <li key={s.step} className={cn("rounded-lg border p-2.5 text-center", s.at ? "border-primary/40 bg-accent/60" : "opacity-50")}>
                <span className={cn("mx-auto grid size-6 place-items-center rounded-full", s.at ? "bg-primary text-primary-foreground" : "bg-muted")}>{s.at && <Check className="size-3.5" />}</span>
                <div className="mt-1.5 text-xs font-semibold">{FUNNEL_LABELS[s.step]}</div>
                <div className="text-[11px] text-muted-foreground">{s.at ? dateTime(s.at) : "—"}</div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5">
          <Card className="gap-3 py-4">
            <CardHeader className="px-5">
              <CardTitle className="font-display text-[15px] font-bold">Откуда пришла</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-5">
              <Touch label="Первое касание" t={c.firstTouch} />
              {c.lastTouch && c.firstTouch && c.lastTouch.at !== c.firstTouch.at && <Touch label="Последнее касание перед ботом" t={c.lastTouch} />}
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-5">
              <CardTitle className="font-display text-[15px] font-bold">Покупки</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {c.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Покупок пока нет.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {c.orders.map((o) => (
                    <li key={o.orderId} className="py-2.5 text-sm first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold">{o.productName}</span>
                        <Badge variant={o.status === "refunded" || o.status === "cancelled" ? "destructive" : "secondary"} className="shrink-0">
                          {ORDER_STATUS_LABELS[o.status]}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.planLabel} · {dateTime(o.createdAt)}
                        {o.isRepeat && " · повторная"}
                      </div>
                      <div className="mt-1 text-xs">
                        Оплачено <b>{rub(o.paid)}</b> из {rub(o.amount)}
                        {o.discountRub > 0 && ` · скидка лепестками ${rub(o.discountRub)}`}
                        {o.installmentMonths && ` · рассрочка ${o.installmentMonths} мес.`}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="gap-3 py-4 xl:col-span-2">
          <CardHeader className="px-5">
            <CardTitle className="font-display text-[15px] font-bold">Хронология</CardTitle>
            <p className="text-xs text-muted-foreground">Касания, действия в приложении, дожимные посты бота, заказы и оплаты — сначала новые</p>
          </CardHeader>
          <CardContent className="px-5">
            <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
              {c.timeline.map((it, i) => {
                const Icon = KIND_ICON[it.kind];
                return (
                  <li key={i} className="relative flex gap-3">
                    <span className={cn("z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card", TONE[it.tone])}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-semibold">{it.title}</span>
                        <span className="text-xs whitespace-nowrap text-muted-foreground">{dateTime(it.at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">{KIND_LABEL[it.kind]}</span>
                        {it.detail && ` · ${it.detail}`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
