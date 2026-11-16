/** Страница «Сводка»: KPI, выручка и расход, воронка, источники, план/факт */
import { KpiCard } from "@/components/widgets/KpiCard";
import { useKpis } from "@/hooks/useData";
import { SUMMARY_KPIS } from "@/lib/kpi";
import { MiniFunnel } from "./MiniFunnel";
import { PlanFactCard } from "./PlanFactCard";
import { RevenueSpendChart } from "./RevenueSpendChart";
import { TopSources } from "./TopSources";

export default function SummaryPage() {
  const kpis = useKpis();
  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Ключевые показатели" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {SUMMARY_KPIS.map((k) => (
          <KpiCard key={k} metric={k} data={kpis.data?.items[k]} loading={kpis.isLoading} />
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-3">
        <RevenueSpendChart className="xl:col-span-2" />
        <PlanFactCard />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniFunnel />
        <TopSources />
      </div>
    </div>
  );
}
