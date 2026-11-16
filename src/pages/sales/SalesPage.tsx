/** Страница «Продажи»: выручка, возвраты, рассрочки, продукты и менеджеры */
import { KpiCard } from "@/components/widgets/KpiCard";
import { useSalesKpis } from "@/hooks/useData";
import { SALES_KPIS } from "@/lib/kpi";
import { ManagersTable } from "./ManagersTable";
import { PaymentKinds } from "./PaymentKinds";
import { ProductRevenue } from "./ProductRevenue";
import { SalesTimeline } from "./SalesTimeline";

export default function SalesPage() {
  const kpis = useSalesKpis();
  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Показатели продаж" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        {SALES_KPIS.map((k) => (
          <KpiCard key={k} metric={k} data={kpis.data?.items[k]} loading={kpis.isLoading} />
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-3">
        <SalesTimeline className="xl:col-span-2" />
        <PaymentKinds />
      </div>
      <ProductRevenue />
      <ManagersTable />
    </div>
  );
}
