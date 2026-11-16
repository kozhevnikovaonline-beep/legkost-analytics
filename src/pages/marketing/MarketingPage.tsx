/** Страница «Маркетинг»: реклама до денег */
import { AttributionSwitch } from "@/components/filters/AttributionSwitch";
import { KpiCard } from "@/components/widgets/KpiCard";
import { useMarketingKpis } from "@/hooks/useData";
import { MARKETING_KPIS } from "@/lib/kpi";
import { TrafficChart } from "./TrafficChart";
import { TrafficTable } from "./TrafficTable";

export default function MarketingPage() {
  const kpis = useMarketingKpis();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AttributionSwitch />
        <p className="text-xs text-muted-foreground">Модель атрибуции меняет лиды, продажи и выручку по источникам. Расход и клики от неё не зависят.</p>
      </div>
      <section aria-label="Показатели рекламы" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {MARKETING_KPIS.map((k) => (
          <KpiCard key={k} metric={k} data={kpis.data?.items[k]} loading={kpis.isLoading} />
        ))}
      </section>
      <TrafficChart />
      <TrafficTable />
    </div>
  );
}
