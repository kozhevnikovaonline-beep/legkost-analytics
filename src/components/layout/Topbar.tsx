/** Верхняя панель: заголовок страницы, представления, тема, слайсеры и активные фильтры */
import { useState } from "react";
import { useLocation } from "react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { navByPath } from "@/app/nav";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterChips } from "@/components/filters/FilterChips";
import { SavedViews } from "@/components/filters/SavedViews";
import { SidebarContent } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar() {
  const { pathname } = useLocation();
  const page = navByPath(pathname) ?? (pathname.startsWith("/clients/") ? { title: "Карточка клиента", description: "Хронология касаний, дожимы, покупки и LTV" } : null);
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/88 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Меню">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-lg font-bold leading-tight md:text-xl">{page?.title ?? "Страница не найдена"}</h1>
            {page && <p className="truncate text-sm text-muted-foreground">{page.description}</p>}
          </div>
          <SavedViews />
          <ThemeToggle />
        </div>
        <FilterBar />
        <FilterChips />
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Меню</SheetTitle>
          <SidebarContent onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
