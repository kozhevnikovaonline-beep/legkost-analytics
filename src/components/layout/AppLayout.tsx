import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { writeFiltersToUrl } from "@/store/filters";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const { pathname } = useLocation();
  // При переходе между страницами фильтры остаются в адресе
  useEffect(() => writeFiltersToUrl(pathname), [pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-5 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
