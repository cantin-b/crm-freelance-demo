"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/providers/UiLanguageProvider";
import { cn } from "@/lib/utils";
import type { List } from "@/types";

type VisibilityFilter = "all" | "visible" | "hidden";
type ListSortKey = "prospect_count" | "created_at" | "name";
type SortDirection = "asc" | "desc";

interface ListWithCount extends Omit<List, "created_at"> {
  created_at: string;
  prospectCount: number;
}

interface SavedListsState {
  page: number;
  pageSize: number;
  visibilityFilter: VisibilityFilter;
  sortKey: ListSortKey;
  sortDirection: SortDirection;
  updatedAt: number;
}

const LISTS_STATE_KEY = "crm_lists_state";
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_LISTS_STATE: SavedListsState = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  visibilityFilter: "all",
  sortKey: "prospect_count",
  sortDirection: "desc",
  updatedAt: 0,
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function sanitizePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function sanitizePageSize(value: unknown): number {
  const pageSize = sanitizePositiveNumber(value, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
}

function sanitizeVisibilityFilter(value: unknown): VisibilityFilter {
  return value === "visible" || value === "hidden" || value === "all" ? value : DEFAULT_LISTS_STATE.visibilityFilter;
}

function sanitizeSortKey(value: unknown): ListSortKey {
  return value === "created_at" || value === "name" || value === "prospect_count" ? value : DEFAULT_LISTS_STATE.sortKey;
}

function sanitizeSortDirection(value: unknown): SortDirection {
  return value === "asc" || value === "desc" ? value : DEFAULT_LISTS_STATE.sortDirection;
}

function readListsState(): SavedListsState {
  if (typeof window === "undefined") return { ...DEFAULT_LISTS_STATE, updatedAt: Date.now() };

  try {
    const saved = JSON.parse(localStorage.getItem(LISTS_STATE_KEY) ?? "null") as Partial<SavedListsState> | null;
    if (saved) {
      return {
        page: sanitizePositiveNumber(saved.page, 1),
        pageSize: sanitizePageSize(saved.pageSize),
        visibilityFilter: sanitizeVisibilityFilter(saved.visibilityFilter),
        sortKey: sanitizeSortKey(saved.sortKey),
        sortDirection: sanitizeSortDirection(saved.sortDirection),
        updatedAt: sanitizePositiveNumber(saved.updatedAt, Date.now()),
      };
    }
  } catch {
    // Ignore malformed saved state.
  }

  return { ...DEFAULT_LISTS_STATE, updatedAt: Date.now() };
}

function writeListsState(state: Omit<SavedListsState, "updatedAt">) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LISTS_STATE_KEY, JSON.stringify({
    ...state,
    updatedAt: Date.now(),
  }));
}

function compareStrings(a: string, b: string, direction: SortDirection) {
  const diff = a.localeCompare(b, undefined, { sensitivity: "base" });
  return direction === "asc" ? diff : -diff;
}

function compareNumbers(a: number, b: number, direction: SortDirection) {
  return direction === "asc" ? a - b : b - a;
}

function sortLists(lists: ListWithCount[], sortKey: ListSortKey, sortDirection: SortDirection) {
  return [...lists].sort((a, b) => {
    let diff = 0;
    if (sortKey === "name") diff = compareStrings(a.name, b.name, sortDirection);
    if (sortKey === "created_at") {
      diff = compareNumbers(new Date(a.created_at).getTime(), new Date(b.created_at).getTime(), sortDirection);
    }
    if (sortKey === "prospect_count") diff = compareNumbers(a.prospectCount, b.prospectCount, sortDirection);
    return diff || compareStrings(a.name, b.name, "asc");
  });
}

export function ListsView({ lists: initial }: { lists: ListWithCount[] }) {
  const t = useT();
  const [initialViewState] = useState(readListsState);
  const [lists, setLists] = useState(initial);
  const [page, setPage] = useState(initialViewState.page);
  const [pageSize, setPageSize] = useState(initialViewState.pageSize);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(initialViewState.visibilityFilter);
  const [sortKey, setSortKey] = useState<ListSortKey>(initialViewState.sortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialViewState.sortDirection);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<ListWithCount | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);

  const counts = useMemo(() => ({
    all: lists.length,
    visible: lists.filter(list => list.is_visible).length,
    hidden: lists.filter(list => !list.is_visible).length,
  }), [lists]);

  const filteredLists = useMemo(() => {
    const visibleFiltered = lists.filter(list => {
      if (visibilityFilter === "visible") return list.is_visible;
      if (visibilityFilter === "hidden") return !list.is_visible;
      return true;
    });
    return sortLists(visibleFiltered, sortKey, sortDirection);
  }, [lists, visibilityFilter, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredLists.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLists = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLists.slice(start, start + pageSize);
  }, [filteredLists, pageSize, safePage]);

  const sortOptions: Array<{ key: ListSortKey; direction: SortDirection; label: string }> = [
    { key: "created_at", direction: "desc", label: t.lists_sort_imported_recent },
    { key: "created_at", direction: "asc", label: t.lists_sort_imported_oldest },
    { key: "name", direction: "asc", label: t.lists_sort_name_asc },
    { key: "name", direction: "desc", label: t.lists_sort_name_desc },
    { key: "prospect_count", direction: "desc", label: t.lists_sort_most_prospects },
    { key: "prospect_count", direction: "asc", label: t.lists_sort_fewest_prospects },
  ];
  const selectedSort = sortOptions.find(option => option.key === sortKey && option.direction === sortDirection) ?? sortOptions[4];

  useEffect(() => {
    writeListsState({ page: safePage, pageSize, visibilityFilter, sortKey, sortDirection });
  }, [safePage, pageSize, sortDirection, sortKey, visibilityFilter]);

  function handlePageChange(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  function handleVisibilityFilterChange(nextFilter: VisibilityFilter) {
    setVisibilityFilter(nextFilter);
    setPage(1);
  }

  function handleSortChange(nextSortKey: ListSortKey, nextDirection: SortDirection) {
    setSortKey(nextSortKey);
    setSortDirection(nextDirection);
    setPage(1);
  }

  async function handleToggle(id: number, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !current }),
      });
      if (!res.ok) return;
      setLists(prev => prev.map(l => l.id === id ? { ...l, is_visible: !current } : l));
    } finally {
      setToggling(null);
    }
  }

  function openRenameModal(list: ListWithCount) {
    setRenaming(list);
    setRenameValue(list.name);
    setRenameError(null);
  }

  async function handleRenameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renaming) return;

    const nextName = renameValue.trim();
    if (!nextName) {
      setRenameError(t.lists_rename_empty);
      return;
    }

    setRenameSaving(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/lists/${renaming.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setRenameError(res.status === 409 ? t.lists_rename_duplicate : data?.error ?? t.lists_rename_failed);
        return;
      }
      setLists(prev => prev.map(list => list.id === renaming.id ? { ...list, name: nextName } : list));
      setRenaming(null);
    } finally {
      setRenameSaving(false);
    }
  }

  async function handleDelete(id: number, name: string, count: number) {
    const keptMsg = count > 0
      ? t.lists_delete_with_count(count)
      : t.lists_delete_confirm(name);
    if (!window.confirm(keptMsg)) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setLists(prev => prev.filter(l => l.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-zinc-400">
        <FolderOpen className="h-8 w-8 text-zinc-200" />
        <p>{t.lists_no_lists}</p>
        <Button asChild size="sm">
          <Link href="/lists/new" className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t.lists_import_csv}
          </Link>
        </Button>
      </div>
    );
  }

  const visibilityOptions: Array<{ value: VisibilityFilter; label: string; count: number }> = [
    { value: "all", label: t.lists_filter_all, count: counts.all },
    { value: "visible", label: t.lists_filter_visible, count: counts.visible },
    { value: "hidden", label: t.lists_filter_hidden, count: counts.hidden },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href="/lists/new" className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t.lists_new_list}
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200/90 bg-white/95 p-3 shadow-surface">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 md:w-auto">
            {visibilityOptions.map(option => {
              const active = visibilityFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleVisibilityFilterChange(option.value)}
                  className={cn(
                    "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition md:flex-none",
                    active
                      ? "bg-white text-zinc-950 shadow-control"
                      : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  <span>{option.label}</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs tabular-nums",
                    active ? "bg-brand-navy/8 text-brand-navy" : "bg-white/70 text-zinc-400"
                  )}>
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 w-full justify-between gap-3 border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-control md:w-72"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="truncate">{selectedSort.label}</span>
                </span>
                <ChevronRight className="h-4 w-4 rotate-90 text-zinc-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {sortOptions.map(option => {
                const selected = option.key === sortKey && option.direction === sortDirection;
                return (
                  <DropdownMenuItem
                    key={`${option.key}-${option.direction}`}
                    onClick={() => handleSortChange(option.key, option.direction)}
                    className="justify-between"
                  >
                    <span>{option.label}</span>
                    <Check className={cn("h-4 w-4 text-brand-navy", selected ? "opacity-100" : "opacity-0")} />
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50/80 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-2.5">{t.lists_col_name}</th>
              <th className="px-4 py-2.5 text-right">{t.lists_col_prospects}</th>
              <th className="px-4 py-2.5">{t.lists_col_imported}</th>
              <th className="px-4 py-2.5 text-center">{t.lists_col_visible}</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paginatedLists.map(list => (
              <tr key={list.id} className="transition-colors hover:bg-zinc-50/70">
                <td className="px-4 py-3 font-medium text-zinc-900">{list.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                  {list.prospectCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(list.created_at)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleToggle(list.id, list.is_visible)}
                    disabled={toggling === list.id}
                    title={list.is_visible ? t.lists_hide_list : t.lists_show_list}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
                  >
                    {list.is_visible
                      ? <><Eye className="h-3.5 w-3.5" /> {t.lists_visible}</>
                      : <><EyeOff className="h-3.5 w-3.5 text-zinc-400" /> {t.lists_hidden}</>}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRenameModal(list)}
                      className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label={t.lists_rename_action}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleting === list.id}
                      onClick={() => handleDelete(list.id, list.name, list.prospectCount)}
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLists.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-zinc-400">{t.lists_no_filtered}</div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {paginatedLists.map(list => (
          <div key={list.id} className="space-y-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-snug text-zinc-900">{list.name}</p>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs tabular-nums text-zinc-600">
                {t.x_prospects_mobile(list.prospectCount)}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{t.lists_imported_on(formatDate(list.created_at))}</p>
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
              <button
                type="button"
                onClick={() => handleToggle(list.id, list.is_visible)}
                disabled={toggling === list.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                {list.is_visible
                  ? <><Eye className="h-3.5 w-3.5 text-zinc-500" /> {t.lists_visible}</>
                  : <><EyeOff className="h-3.5 w-3.5 text-zinc-400" /> {t.lists_hidden}</>}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openRenameModal(list)}
                className="ml-auto h-8 w-8 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={t.lists_rename_action}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting === list.id}
                onClick={() => handleDelete(list.id, list.name, list.prospectCount)}
                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filteredLists.length === 0 && (
          <div className="rounded-xl border border-zinc-200/90 bg-white p-8 text-center text-sm text-zinc-400 shadow-surface">
            {t.lists_no_filtered}
          </div>
        )}
      </div>
      <div aria-hidden="true" className="h-[calc(8rem+env(safe-area-inset-bottom,0px))] md:hidden" />

      <div className="hidden items-center justify-between py-3 md:flex">
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={v => handlePageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-17.5 border-zinc-200 text-xs text-zinc-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-400">{t.per_page}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {totalPages > 1
              ? t.lists_page(filteredLists.length, safePage, totalPages)
              : t.lists_total(filteredLists.length)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-zinc-200 p-0 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-zinc-200 p-0 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-30 flex h-12 items-center justify-between border-t border-zinc-200/80 bg-white/95 px-4 shadow-[0_-4px_16px_-4px_rgb(24_24_27/0.08)] backdrop-blur-sm md:hidden"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-1.5">
          <Select
            value={String(pageSize)}
            onValueChange={v => handlePageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-7 w-14.5 border-zinc-200 text-xs text-zinc-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-zinc-400">{t.per_page}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {t.lists_total(filteredLists.length)}
            {totalPages > 1 && (
              <span className="text-zinc-400"> · {safePage}/{totalPages}</span>
            )}
          </span>
          {totalPages > 1 && (
            <div className="ml-1 flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 border-zinc-200 p-0 text-zinc-500 disabled:opacity-30"
                disabled={safePage <= 1}
                onClick={() => handlePageChange(safePage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 border-zinc-200 p-0 text-zinc-500 disabled:opacity-30"
                disabled={safePage >= totalPages}
                onClick={() => handlePageChange(safePage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRenameSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{t.lists_rename_title}</DialogTitle>
              <DialogDescription>{t.lists_rename_description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="list-name">{t.lists_rename_label}</Label>
              <Input
                id="list-name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                autoFocus
              />
              {renameError && <p className="text-sm text-red-600">{renameError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)} disabled={renameSaving}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={renameSaving || !renameValue.trim()}>
                {t.lists_rename_save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
