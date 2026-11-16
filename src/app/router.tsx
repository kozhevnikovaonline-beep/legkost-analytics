/** Маршруты. Hash-роутинг — чтобы работало на GitHub Pages без настройки сервера. Страницы грузятся лениво */
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createHashRouter, Link } from "react-router";
import { SearchX } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/widgets/EmptyState";
import { PagePlaceholder } from "@/pages/PagePlaceholder";
import { NAV } from "./nav";

/** Готовые страницы; остальные пока показывают заготовку */
const READY: Record<string, ComponentType> = {
  "/": lazy(() => import("@/pages/summary/SummaryPage")),
  "/marketing": lazy(() => import("@/pages/marketing/MarketingPage")),
  "/funnel": lazy(() => import("@/pages/funnel/FunnelPage")),
  "/sales": lazy(() => import("@/pages/sales/SalesPage")),
  "/clients": lazy(() => import("@/pages/clients/ClientsPage")),
};

const ClientCardPage = lazy(() => import("@/pages/clients/ClientCardPage"));

const PageFallback = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {Array.from({ length: 12 }, (_, i) => (
      <Skeleton key={i} className="h-28" />
    ))}
  </div>
);
const withSuspense = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

const pages = NAV.filter((n) => !n.soon && !n.hidden);

export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      ...pages.map((p) => {
        const Page = READY[p.path];
        return { path: p.path, element: Page ? withSuspense(<Page />) : <PagePlaceholder page={p} /> };
      }),
      {
        path: "/clients/:id",
        element: withSuspense(<ClientCardPage />),
      },
      {
        path: "*",
        element: (
          <EmptyState
            icon={SearchX}
            title="Страница не найдена"
            text="Такого раздела нет. Вернитесь к сводке."
            action={
              <Button asChild>
                <Link to="/">К сводке</Link>
              </Button>
            }
          />
        ),
      },
    ],
  },
]);
