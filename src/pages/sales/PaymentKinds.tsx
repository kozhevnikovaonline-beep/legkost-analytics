/** Структура оплат: полная оплата, рассрочка, продления клуба; возвраты отдельной строкой */
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { ChartCard } from "@/components/widgets/ChartCard";
import { baseOption, EChart, usePalette } from "@/components/charts/EChart";
import { useSalesBreakdown } from "@/hooks/useData";
import { num, pct, rub } from "@/lib/format";
import type { PaymentKind } from "@/types/domain";

const LABELS: Record<PaymentKind, string> = { full: "Полная оплата", installment: "Рассрочка", subscription: "Продления клуба", refund: "Возвраты" };

export function PaymentKinds({ className }: { className?: string }) {
  const q = useSalesBreakdown();
  const p = usePalette();
  const kinds = q.data?.byKind ?? [];
  const positive = kinds.filter((k) => k.kind !== "refund");
  const total = positive.reduce((s, k) => s + k.amount, 0);
  const refund = kinds.find((k) => k.kind === "refund");
  const colors: Record<PaymentKind, string> = { full: p.series[0]!, installment: p.series[2]!, subscription: p.series[1]!, refund: p.negative };

  const option = useMemo<EChartsOption>(
    () => ({
      ...baseOption(p),
      legend: { show: false },
      tooltip: { ...(baseOption(p).tooltip as object), trigger: "item", formatter: (x: unknown) => { const it = x as { name: string; value: number; percent: number }; return `<b>${it.name}</b><br/>${rub(it.value)} · ${pct(it.percent / 100)}`; } },
      series: [
        {
          type: "pie",
          radius: ["58%", "82%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: p.card, borderWidth: 3, borderRadius: 6 },
          data: positive.map((k) => ({ name: LABELS[k.kind], value: k.amount, itemStyle: { color: colors[k.kind] } })),
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data, p],
  );

  return (
    <ChartCard
      className={className}
      title="Как платят"
      hint="Структура успешных оплат за период по сумме. Возвраты показаны отдельно и в круг не входят."
      loading={q.isLoading}
      error={q.error}
      empty={!!q.data && total === 0}
      height={300}
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <EChart option={option} height={170} ariaLabel="Структура оплат" />
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <div className="text-[11px] text-muted-foreground">Оплаты</div>
            <div className="font-display text-base font-bold">{rub(total, total >= 1_000_000)}</div>
          </div>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {positive.map((k) => (
            <li key={k.kind} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colors[k.kind] }} />
              <span className="min-w-0 flex-1 truncate">{LABELS[k.kind]}</span>
              <span className="text-right tabular-nums">
                <b>{pct(total ? k.amount / total : null)}</b>
                <span className="block text-[11px] text-muted-foreground">{num(k.count)} платежей</span>
              </span>
            </li>
          ))}
          {refund && (
            <li className="flex items-center gap-2 border-t pt-2 text-negative">
              <span className="size-2.5 shrink-0 rounded-sm bg-negative" />
              <span className="flex-1">Возвраты</span>
              <span className="text-right tabular-nums">
                <b>{rub(Math.abs(refund.amount))}</b>
                <span className="block text-[11px]">{num(refund.count)} шт.</span>
              </span>
            </li>
          )}
        </ul>
      </div>
    </ChartCard>
  );
}
