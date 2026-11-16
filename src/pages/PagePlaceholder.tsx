/** Заготовка страницы до шага 4: скелетон сетки и список будущих виджетов */
import { Hammer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/widgets/EmptyState";
import { useFilters } from "@/store/filters";
import { rangeLabel } from "@/lib/format";
import type { NavItem } from "@/app/nav";

export function PagePlaceholder({ page }: { page: Pick<NavItem, "title" | "widgets"> }) {
  const { from, to } = useFilters();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="gap-3 py-4">
            <CardContent className="flex flex-col gap-2 px-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Что будет на странице «{page.title}»</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {page.widgets.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <EmptyState icon={Hammer} title="Виджеты — на шаге 4" text={`Каркас, фильтры и тема уже работают. Текущий период: ${rangeLabel(from, to)}.`} />
      </div>
    </div>
  );
}
