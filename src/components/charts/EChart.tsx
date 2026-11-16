/**
 * Обёртка над ECharts: подключаем только нужные модули (меньше бандл),
 * цвета берём из CSS-переменных темы — графики перекрашиваются вместе со светлой/тёмной темой.
 */
import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/esm/core";
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, PieChart } from "echarts/charts";
import { DatasetComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useTheme } from "@/store/theme";

echarts.use([BarChart, LineChart, PieChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, DatasetComponent, MarkLineComponent, VisualMapComponent, CanvasRenderer]);

export interface ChartPalette {
  fg: string;
  muted: string;
  border: string;
  card: string;
  popover: string;
  positive: string;
  negative: string;
  series: string[];
}

const ruNum = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Цвета текущей темы для графиков */
export function usePalette(): ChartPalette {
  const theme = useTheme((s) => s.theme);
  return useMemo(
    () => ({
      fg: css("--foreground"),
      muted: css("--muted-foreground"),
      border: css("--border"),
      card: css("--card"),
      popover: css("--popover"),
      positive: css("--positive"),
      negative: css("--negative"),
      series: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"].map(css),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );
}

/** Общие настройки осей, сетки и тултипа в цветах темы */
export function baseOption(p: ChartPalette): EChartsOption {
  return {
    color: p.series,
    textStyle: { fontFamily: "Manrope, system-ui, sans-serif", color: p.fg },
    grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      backgroundColor: p.popover,
      borderColor: p.border,
      textStyle: { color: p.fg, fontSize: 12 },
      extraCssText: "border-radius:10px;box-shadow:0 12px 32px -12px rgba(0,0,0,.35);",
    },
    legend: { textStyle: { color: p.muted, fontSize: 12 }, icon: "roundRect", itemWidth: 12, itemHeight: 8, top: 0, right: 0 },
  };
}

export const axisStyle = (p: ChartPalette) => ({
  axisLine: { lineStyle: { color: p.border } },
  axisTick: { show: false },
  // Числа на осях — по-русски: «1 000», а не «1,000»
  axisLabel: { color: p.muted, fontSize: 11, formatter: (v: string | number) => (typeof v === "number" ? ruNum.format(v) : v) },
  splitLine: { lineStyle: { color: p.border, type: "dashed" as const } },
});

interface Props {
  option: EChartsOption;
  height?: number;
  onClick?: (params: { name: string; dataIndex: number; seriesName?: string; data: unknown }) => void;
  ariaLabel: string;
}

export function EChart({ option, height = 280, onClick, ariaLabel }: Props) {
  const events = useMemo(() => (onClick ? { click: onClick } : undefined), [onClick]);
  return (
    <div role="img" aria-label={ariaLabel}>
      <ReactEChartsCore echarts={echarts} option={option} notMerge lazyUpdate style={{ height, width: "100%" }} onEvents={events} opts={{ renderer: "canvas" }} />
    </div>
  );
}
