/** Выручка по продуктам: клик по столбцу — фильтр по продукту на всю страницу */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { axisStyle, baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useSalesBreakdown } from "@/hooks/useData";
import { CATEGORY_LABELS } from "@/lib/labels";
import { num, pct, rub } from "@/lib/format";
import { useFilters } from "@/store/filters";
import type { ProductCategory } from "@/types/domain";

const shortName = (s: string) => s.replace(/^(Курс|Гайд|Марафон) /, "").replace(/«|»/g, "").replace("Онлайн-программа Лёгкость · ", "Программа · ");

export function ProductRevenue({ className }: { className?: string }) {
  const q = useSalesBreakdown();
  const p = usePalette();
  const selected = useFilters((s) => s.productIds);
  const toggle = useFilters((s) => s.toggle);
  const rows = useMemo(() => (q.data?.byProduct ?? []).filter((r) => r.revenue !== 0 || r.orders > 0).slice(0, 12), [q.data]);
  const catColor: Record<ProductCategory, string> = { lead_magnet: p.muted, tripwire: p.series[3]!, subscription: p.series[1]!, course: p.series[0]!, mentorship: p.series[2]! };

  const option = useMemo<EChartsOption | null>(() => {
    if (!q.data) return null;
    const list = [...rows].reverse();
    return {
      ...baseOption(p),
      grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...(baseOption(p).tooltip as object),
        trigger: "item",
        formatter: (x: unknown) => {
          const r = list[(x as { dataIndex: number }).dataIndex]!;
          return `<b>${r.name}</b><br/>${CATEGORY_LABELS[r.category]}<br/>Выручка net: <b>${rub(r.revenue)}</b> (${pct(r.share)})<br/>Gross: ${rub(r.gross)} · возвраты: ${rub(r.refunds)}<br/>Продажи: ${num(r.sales)} · заказы: ${num(r.orders)}`;
        },
      },
      xAxis: { type: "value", ...axisStyle(p), axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => rub(v, true) } },
      yAxis: { type: "category", data: list.map((r) => shortName(r.name)), ...axisStyle(p), splitLine: { show: false }, axisLabel: { color: p.fg, fontSize: 12, width: 190, overflow: "truncate" } },
      series: [
        {
          type: "bar",
          barMaxWidth: 18,
          data: list.map((r) => ({ value: r.revenue, itemStyle: { color: catColor[r.category], opacity: selected.length && !selected.includes(r.productId) ? 0.3 : 1, borderRadius: [0, 4, 4, 0] } })),
          label: { show: true, position: "right", color: p.muted, fontSize: 11, formatter: (x: { dataIndex: number }) => pct(list[x.dataIndex]!.share) },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, rows, p, selected]);

  const cats = (["course", "mentorship", "subscription", "tripwire"] as ProductCategory[]).map((c) => ({ c, color: catColor[c] }));

  return (
    <ChartCard
      className={className}
      title="Выручка по продуктам"
      hint="Net-выручка за период по продуктам, справа — доля в общей выручке. Цвет — категория продукта. Клик по столбцу — фильтр по продукту."
      subtitle={
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {cats.map(({ c, color }) => (
            <span key={c} className="inline-flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ background: color }} /> {CATEGORY_LABELS[c]}
            </span>
          ))}
        </span>
      }
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && rows.length === 0}
      height={360}
    >
      {option && (
        <EChart
          option={option}
          height={Math.max(260, rows.length * 30)}
          ariaLabel="Выручка по продуктам"
          onClick={({ dataIndex }) => {
            const r = [...rows].reverse()[dataIndex];
            if (r) toggle("productIds", r.productId);
          }}
        />
      )}
    </ChartCard>
  );
}
