/** Страница «Воронка»: где клиенты останавливаются и какие дожимы их возвращают */
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricTooltip } from "@/components/widgets/MetricTooltip";
import { useFunnel, useStalls } from "@/hooks/useData";
import { num, pct } from "@/lib/format";
import type { FunnelStep } from "@/types/domain";
import { FunnelBySource } from "./FunnelBySource";
import { FunnelSteps } from "./FunnelSteps";
import { NurtureTable } from "./NurtureTable";
import { StallsChart } from "./StallsChart";

function Stat({ label, value, sub, hint, loading }: { label: string; value: string; sub?: string; hint: string; loading: boolean }) {
  return (
    <Card className="gap-1 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
        {label}
        <MetricTooltip title={label} formula={hint} />
      </div>
      {loading ? <Skeleton className="h-7 w-24" /> : <div className="font-display text-[22px] font-bold leading-tight whitespace-nowrap">{value}</div>}
      {sub && !loading && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export default function FunnelPage() {
  const funnel = useFunnel();
  const stallsQ = useStalls();
  const count = (s: FunnelStep) => funnel.data?.steps.find((x) => x.step === s)?.count ?? 0;
  const clicks = count("click");
  const returned = stallsQ.data?.steps.reduce((s, x) => s + x.returned, 0) ?? 0;
  const sent = stallsQ.data?.steps.reduce((s, x) => s + x.sent, 0) ?? 0;
  const blocked = stallsQ.data?.steps.reduce((s, x) => s + x.blocked, 0) ?? 0;
  const loading = funnel.isLoading || stallsQ.isLoading;

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Итоги воронки" className="kpi-row">
        <Stat loading={loading} label="Пришли" value={num(clicks)} sub="кликов за период" hint="Уникальные визитёры с меткой за период: реклама, посевы, органика, рефералы." />
        <Stat loading={loading} label="Стали лидами" value={num(count("lead"))} sub={`${pct(clicks ? count("lead") / clicks : null)} от клика`} hint="Прошли приветствие в Web App и получили доступ к урокам." />
        <Stat loading={loading} label="Прошли мини-курс" value={num(count("lesson_3"))} sub={`${pct(count("lead") ? count("lesson_3") / count("lead") : null)} от лидов`} hint="Отметили пройденным третий бесплатный урок." />
        <Stat loading={loading} label="Оплатили" value={num(count("payment"))} sub={`${pct(clicks ? count("payment") / clicks : null)} от клика`} hint="Сделали первую оплату (включая первый платёж рассрочки)." />
        <Stat
          loading={loading}
          label="Продвинулись после дожимов"
          value={num(returned)}
          sub={`клиенток · ${num(sent)} постов · ${num(blocked)} блокировок`}
          hint="Сколько клиенток после дожимного поста бота перешли на следующий шаг воронки в течение 72 часов (по всем шагам)."
        />
      </section>
      <FunnelSteps />
      <StallsChart />
      <NurtureTable />
      <FunnelBySource />
    </div>
  );
}
