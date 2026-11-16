/** Лёгкий SVG-спарклайн (без ECharts — карточек много, а рисовать нужно быстро) */
import { useId } from "react";

export function Sparkline({ values, color = "var(--chart-1)", height = 28 }: { values: (number | null)[]; color?: string; height?: number }) {
  const id = useId();
  const pts = values.map((v, i) => ({ i, v })).filter((p): p is { i: number; v: number } => p.v !== null && Number.isFinite(p.v));
  if (pts.length < 2) return <div style={{ height }} />;
  const w = 100;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const line = pts.map((p) => `${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`).join(" ");
  const area = `${x(pts[0]!.i)},${height} ${line} ${x(pts.at(-1)!.i)},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
