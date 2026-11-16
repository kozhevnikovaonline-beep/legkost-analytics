/** Сохранённые представления: текущая страница + фильтры одним кликом */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { navByPath } from "@/app/nav";
import { pickFilters, useFilters } from "@/store/filters";
import { useViews } from "@/store/views";

export function SavedViews() {
  const { views, save, remove } = useViews();
  const location = useLocation();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");

  const submit = () => {
    save(name, location.pathname, pickFilters(useFilters.getState()));
    setDialog(false);
    setName("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold">
            <Bookmark className="size-4" />
            <span className="hidden sm:inline">Представления</span>
            {views.length > 0 && <span className="rounded-full bg-muted px-1.5 text-[11px] leading-5">{views.length}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Сохранённые представления</DropdownMenuLabel>
          {views.length === 0 && <div className="px-2 pb-2 text-xs text-muted-foreground">Сохраните текущую страницу с фильтрами, чтобы вернуться к ней одним кликом.</div>}
          {views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onSelect={() => {
                useFilters.getState().apply(v.filters);
                navigate(v.path);
              }}
              className="group justify-between"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{v.name}</span>
                <span className="block text-xs text-muted-foreground">{navByPath(v.path)?.title ?? v.path}</span>
              </span>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground opacity-60 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label={`Удалить «${v.name}»`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  remove(v.id);
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog(true)}>
            <BookmarkPlus className="size-4" /> Сохранить текущее…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сохранить представление</DialogTitle>
            <DialogDescription>Страница «{navByPath(location.pathname)?.title ?? "—"}» и все текущие фильтры сохранятся в этом браузере.</DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Например: VK за 30 дней" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Отмена
            </Button>
            <Button onClick={submit}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
