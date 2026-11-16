/** Маршруты. Hash-роутинг — чтобы работало на GitHub Pages без настройки сервера */
import { createHashRouter, Link } from "react-router";
import { SearchX } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/widgets/EmptyState";
import { PagePlaceholder } from "@/pages/PagePlaceholder";
import { NAV } from "./nav";

const pages = NAV.filter((n) => !n.soon);

export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      ...pages.map((p) => ({ path: p.path, element: <PagePlaceholder page={p} /> })),
      {
        path: "/clients/:id",
        element: <PagePlaceholder page={{ title: "Карточка клиента", widgets: ["Профиль и теги", "Хронология касаний и дожимных постов", "Покупки и оплаты", "LTV"] }} />,
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
