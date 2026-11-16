/** Боковое меню в фирменном градиенте первого экрана сайта */
import { NavLink } from "react-router";
import { Database } from "lucide-react";
import { NAV } from "@/app/nav";
import { useMeta } from "@/hooks/useData";
import { rangeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const meta = useMeta();
  const main = NAV.filter((n) => !n.soon);
  const soon = NAV.filter((n) => n.soon);

  return (
    <div className="bg-hero relative flex h-full flex-col overflow-hidden text-white">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <Logo />
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-wide">ЛЁГКОСТЬ</div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Аналитика</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Разделы">
        {main.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/72 transition-colors hover:bg-white/8 hover:text-white",
                isActive && "bg-white/12 text-white shadow-[inset_3px_0_0_var(--lime)]",
              )
            }
          >
            <item.icon className="size-[18px] shrink-0 opacity-90" />
            {item.title}
          </NavLink>
        ))}

        <div className="mt-6 px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">Скоро</div>
        {soon.map((item) => (
          <div key={item.path} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/35" title={item.description}>
            <item.icon className="size-[18px] shrink-0" />
            {item.title}
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-white/10 bg-white/6 p-3 text-xs text-white/70">
        <div className="mb-1 flex items-center gap-2 font-bold text-[var(--lime)]">
          <Database className="size-3.5" /> Демо-данные
        </div>
        {meta.data ? (
          <>
            {rangeLabel(meta.data.startDate, meta.data.endDate)} · {meta.data.kind === "mock" ? "генератор" : "API"}
          </>
        ) : (
          "Загрузка…"
        )}
        <div className="mt-1 text-white/45">Валюта ₽ · Europe/Moscow</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
      <SidebarContent />
    </aside>
  );
}
