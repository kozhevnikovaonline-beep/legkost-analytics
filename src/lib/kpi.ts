/** Набор KPI сводки из агрегатов периода — чистая функция поверх metrics.ts */
import * as m from "./metrics.ts";

export interface KpiInputs {
  revenue: number;
  spend: number;
  leads: number;
  sales: number;
  newCustomers: number;
  newCustomersLtv: number;
}

export const SUMMARY_KPIS = ["revenue", "spend", "profit", "romi", "roas", "leads", "sales", "crLeadPay", "avgCheck", "cac", "ltv", "ltvCac"] as const;
export type SummaryKpi = (typeof SUMMARY_KPIS)[number];

export function summaryKpis(x: KpiInputs): Record<SummaryKpi, number | null> {
  const cacV = m.cac(x.spend, x.newCustomers);
  const ltvV = m.safeDiv(x.newCustomersLtv, x.newCustomers);
  return {
    revenue: x.revenue,
    spend: x.spend,
    profit: m.profit(x.revenue, x.spend),
    romi: m.romi(x.revenue, x.spend),
    roas: m.roas(x.revenue, x.spend),
    leads: x.leads,
    sales: x.sales,
    crLeadPay: m.cr(x.sales, x.leads),
    avgCheck: m.avgCheck(x.revenue, x.sales),
    cac: cacV,
    ltv: ltvV,
    ltvCac: m.ltvCac(ltvV, cacV),
  };
}
