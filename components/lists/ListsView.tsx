"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { List } from "@/types";

interface ListWithCount extends Omit<List, "created_at"> {
  created_at: string; // serialised from server
  prospectCount: number;
}

interface SavedListsState {
  page: number;
  pageSize: number;
  updatedAt: number;
}

const LISTS_STATE_KEY = "crm_lists_state";
const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

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

function readListsState(): SavedListsState {
  if (typeof window === "undefined") {
    return { page: 1, pageSize: DEFAULT_PAGE_SIZE, updatedAt: Date.now() };
  }

  try {
    const saved = JSON.parse(localStorage.getItem(LISTS_STATE_KEY) ?? "null") as Partial<SavedListsState> | null;
    if (saved) {
      return {
        page: sanitizePositiveNumber(saved.page, 1),
        pageSize: sanitizePageSize(saved.pageSize),
        updatedAt: sanitizePositiveNumber(saved.updatedAt, Date.now()),
      };
    }
  } catch {
    // Ignore malformed saved state.
  }

  return { page: 1, pageSize: DEFAULT_PAGE_SIZE, updatedAt: Date.now() };
}

function writeListsState(page: number, pageSize: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LISTS_STATE_KEY, JSON.stringify({
    page,
    pageSize,
    updatedAt: Date.now(),
  }));
}

export function ListsView({ lists: initial }: { lists: ListWithCount[] }) {
  const t = useT();
  const [initialViewState] = useState(readListsState);
  const [lists, setLists] = useState(initial);
  const [page, setPage] = useState(initialViewState.page);
  const [pageSize, setPageSize] = useState(initialViewState.pageSize);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(lists.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLists = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return lists.slice(start, start + pageSize);
  }, [lists, pageSize, safePage]);

  useEffect(() => {
    writeListsState(safePage, pageSize);
  }, [safePage, pageSize]);

  function handlePageChange(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
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
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400 text-sm gap-3">
        <FolderOpen className="w-8 h-8 text-zinc-200" />
        <p>{t.lists_no_lists}</p>
        <Button asChild size="sm">
          <Link href="/lists/new" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t.lists_import_csv}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href="/lists/new" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t.lists_new_list}
          </Link>
        </Button>
      </div>

      {/* Table (desktop) */}
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
                    onClick={() => handleToggle(list.id, list.is_visible)}
                    disabled={toggling === list.id}
                    title={list.is_visible ? t.lists_hide_list : t.lists_show_list}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
                  >
                    {list.is_visible
                      ? <><Eye className="w-3.5 h-3.5" /> {t.lists_visible}</>
                      : <><EyeOff className="w-3.5 h-3.5 text-zinc-400" /> {t.lists_hidden}</>}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting === list.id}
                    onClick={() => handleDelete(list.id, list.name, list.prospectCount)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden flex flex-col gap-3">
        {paginatedLists.map(list => (
          <div key={list.id} className="space-y-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface">
            {/* Name + count */}
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-zinc-900 leading-snug">{list.name}</p>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs tabular-nums text-zinc-600">
                {t.x_prospects_mobile(list.prospectCount)}
              </span>
            </div>
            {/* Import date */}
            <p className="text-xs text-zinc-400">{t.lists_imported_on(formatDate(list.created_at))}</p>
            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
              <button
                onClick={() => handleToggle(list.id, list.is_visible)}
                disabled={toggling === list.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:bg-zinc-50"
              >
                {list.is_visible
                  ? <><Eye className="w-3.5 h-3.5 text-zinc-500" /> {t.lists_visible}</>
                  : <><EyeOff className="w-3.5 h-3.5 text-zinc-400" /> {t.lists_hidden}</>}
              </button>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting === list.id}
                onClick={() => handleDelete(list.id, list.name, list.prospectCount)}
                className="ml-auto h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="md:hidden h-[calc(8rem+env(safe-area-inset-bottom,0px))]" />

      {/* Pagination — desktop (inline) */}
      <div className="hidden md:flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={v => handlePageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-17.5 text-xs text-zinc-600 border-zinc-200">
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
              ? t.lists_page(lists.length, safePage, totalPages)
              : t.lists_total(lists.length)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(safePage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(safePage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pagination — mobile (fixed bar above BottomNav) */}
      <div
        className="md:hidden fixed inset-x-0 z-30 h-12 bg-white/95 backdrop-blur-sm border-t border-zinc-200/80 shadow-[0_-4px_16px_-4px_rgb(24_24_27/0.08)] flex items-center justify-between px-4"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-1.5">
          <Select
            value={String(pageSize)}
            onValueChange={v => handlePageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-7 w-14.5 text-xs text-zinc-600 border-zinc-200">
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
            {t.lists_total(lists.length)}
            {totalPages > 1 && (
              <span className="text-zinc-400"> · {safePage}/{totalPages}</span>
            )}
          </span>
          {totalPages > 1 && (
            <div className="flex gap-1 ml-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 border-zinc-200 text-zinc-500 disabled:opacity-30"
                disabled={safePage <= 1}
                onClick={() => handlePageChange(safePage - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 border-zinc-200 text-zinc-500 disabled:opacity-30"
                disabled={safePage >= totalPages}
                onClick={() => handlePageChange(safePage + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
