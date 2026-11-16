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

// ── Маркетинг ──────────────────────────────────────────────
export interface TrafficInputs {
  impressions: number;
  clicks: number;
  paidClicks: number;
  spend: number;
  leads: number;
  sales: number;
  revenue: number;
  newCustomers: number;
}

export const MARKETING_KPIS = ["impressions", "clicks", "ctr", "cpm", "cpc", "cpl", "crClickLead"] as const;
export type MarketingKpi = (typeof MARKETING_KPIS)[number];

/** Метрики строки таблицы трафика «до денег» */
export function trafficMetrics(x: TrafficInputs) {
  return {
    impressions: x.impressions,
    clicks: x.clicks,
    ctr: m.ctr(x.paidClicks, x.impressions),
    spend: x.spend,
    cpm: m.cpm(x.spend, x.impressions),
    cpc: m.cpc(x.spend, x.paidClicks),
    leads: x.leads,
    // У бесплатных источников (органика, рефералы) нет расхода — CPL и CAC не считаем
    cpl: x.spend > 0 ? m.cpl(x.spend, x.leads) : null,
    crClickLead: m.cr(x.leads, x.clicks),
    sales: x.sales,
    revenue: x.revenue,
    romi: m.romi(x.revenue, x.spend),
    cac: x.spend > 0 ? m.cac(x.spend, x.newCustomers) : null,
  };
}

export type TrafficMetrics = ReturnType<typeof trafficMetrics>;

// ── Продажи ────────────────────────────────────────────────
export interface SalesInputs {
  gross: number;
  refunds: number;
  net: number;
  orders: number;
  payments: number;
  sales: number;
  installmentSales: number;
  payers: number;
  users: number;
}

export const SALES_KPIS = ["gross", "revenue", "refunds", "orders", "payments", "avgCheck", "arpu", "arppu", "installmentShare"] as const;
export type SalesKpi = (typeof SALES_KPIS)[number];

export function salesKpis(x: SalesInputs): Record<SalesKpi, number | null> {
  return {
    gross: x.gross,
    revenue: x.net,
    refunds: x.refunds,
    orders: x.orders,
    payments: x.payments,
    avgCheck: m.avgCheck(x.net, x.sales),
    arpu: m.arpu(x.net, x.users),
    arppu: m.arppu(x.net, x.payers),
    installmentShare: m.safeDiv(x.installmentSales, x.sales),
  };
}
