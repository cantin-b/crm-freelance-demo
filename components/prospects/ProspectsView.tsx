"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProspectFilters, INITIAL_FILTERS } from "./ProspectFilters";
import type { Filters, VisibleFilter } from "./ProspectFilters";
import { ProspectTable } from "./ProspectTable";
import { SendEmailModal } from "./SendEmailModal";
import {
  PROSPECT_FILTER_STATUS_OPTIONS,
  PROSPECT_ROW_STATUS_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/constants";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Prospect } from "@/types";

interface ApiResponse {
  prospects: Prospect[];
  total: number;
  page: number;
  totalPages: number;
  navIds: number[];
  categories: string[];
  listNames: string[];
}

interface Props {
  apiUrl?: string;
  pageTitle?: string;
}

type ListViewSource = "prospects" | "clients";

interface SavedListState {
  filters: Filters;
  page: number;
  pageSize: number;
  lastViewedProspectId: number | null;
  pendingReturnProspectId: number | null;
  navIds: number[];
  updatedAt: number;
}

const DEFAULT_PAGE_SIZE = 50;
const PROSPECTS_STATE_KEY = "crm_prospects_state";
const CLIENTS_STATE_KEY = "crm_clients_state";
const DETAIL_SOURCE_KEY = "crm_prospect_detail_source";
const LEGACY_PROSPECT_FILTERS_KEY = "crm_prospect_filters";
const PROSPECT_VISIBLE_FILTERS: VisibleFilter[] = ["status", "category", "country", "email", "website", "list"];
const CLIENT_VISIBLE_FILTERS: VisibleFilter[] = ["status", "category", "country"];

function createDefaultListState(): SavedListState {
  return {
    filters: INITIAL_FILTERS,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    lastViewedProspectId: null,
    pendingReturnProspectId: null,
    navIds: [],
    updatedAt: Date.now(),
  };
}

function sanitizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function sanitizePresenceFilter(value: unknown): "all" | "yes" | "no" {
  return value === "yes" || value === "no" ? value : "all";
}

function sanitizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function sanitizeFilters(value: unknown): Filters {
  const source = typeof value === "object" && value !== null ? value as Partial<Filters> : {};
  return {
    search: typeof source.search === "string" ? source.search : "",
    countries: sanitizeStringArray(source.countries),
    categories: sanitizeStringArray(source.categories),
    statuses: sanitizeStringArray(source.statuses),
    hasEmail: sanitizePresenceFilter(source.hasEmail),
    hasWebsite: sanitizePresenceFilter(source.hasWebsite),
    listName: typeof source.listName === "string" ? source.listName : "",
  };
}

function normalizeFiltersForSource(filters: Filters, source: ListViewSource): Filters {
  if (source !== "clients") return filters;
  return {
    ...filters,
    hasEmail: "all",
    hasWebsite: "all",
    listName: "",
  };
}

function sanitizeNavIds(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    : [];
}

function getInitialPage(state: SavedListState): number {
  if (state.pendingReturnProspectId && state.navIds.length) {
    const index = state.navIds.indexOf(state.pendingReturnProspectId);
    if (index >= 0) return Math.floor(index / state.pageSize) + 1;
  }
  return state.page;
}

function buildFilterSignature(filters: Filters, search = filters.search): string {
  return JSON.stringify({ ...filters, search });
}

function getViewStorageKey(source: ListViewSource): string {
  return source === "clients" ? CLIENTS_STATE_KEY : PROSPECTS_STATE_KEY;
}

function readListState(storageKey: string, source: ListViewSource): SavedListState {
  const fallback = createDefaultListState();
  if (typeof window === "undefined") return fallback;

  const hasSavedState = localStorage.getItem(storageKey) !== null;
  const hasLegacyProspectFilters =
    storageKey === PROSPECTS_STATE_KEY && localStorage.getItem(LEGACY_PROSPECT_FILTERS_KEY) !== null;

  try {
    const savedRaw = hasSavedState ? localStorage.getItem(storageKey) ?? "null" : "null";
    const saved = JSON.parse(savedRaw) as Partial<SavedListState> | null;
    if (saved) {
      const pageSize = sanitizePositiveNumber(saved.pageSize, DEFAULT_PAGE_SIZE);
      return {
        filters: normalizeFiltersForSource(sanitizeFilters(saved.filters), source),
        page: sanitizePositiveNumber(saved.page, 1),
        pageSize,
        lastViewedProspectId: sanitizeNullableNumber(saved.lastViewedProspectId),
        pendingReturnProspectId: sanitizeNullableNumber(saved.pendingReturnProspectId),
        navIds: sanitizeNavIds(saved.navIds),
        updatedAt: sanitizePositiveNumber(saved.updatedAt, Date.now()),
      };
    }
  } catch {
    // Ignore malformed saved state and fall back to defaults.
  }

  if (hasLegacyProspectFilters) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_PROSPECT_FILTERS_KEY) ?? "null") as {
        filters?: unknown;
        pageSize?: unknown;
      } | null;
      if (legacy) {
        return {
          ...fallback,
          filters: sanitizeFilters(legacy.filters),
          pageSize: sanitizePositiveNumber(legacy.pageSize, DEFAULT_PAGE_SIZE),
        };
      }
    } catch {
      // Ignore legacy state as well.
    }
  }

  if (source === "prospects" && !hasSavedState && !hasLegacyProspectFilters) {
    return {
      ...fallback,
      filters: {
        ...fallback.filters,
        statuses: ["new"],
      },
    };
  }

  return fallback;
}

function writeListState(storageKey: string, state: SavedListState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

function getVisibleProspectElement(id: number): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll(`[data-prospect-id="${id}"]`));
  const visible = candidates.find((candidate): candidate is HTMLElement => {
    if (!(candidate instanceof HTMLElement)) return false;
    if (candidate.getClientRects().length === 0) return false;
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  if (visible) return visible;

  const fallback = candidates.find((candidate): candidate is HTMLElement =>
    candidate instanceof HTMLElement
  );
  return fallback ?? null;
}

export function ProspectsView({
  apiUrl = "/api/prospects",
  pageTitle,
}: Props) {
  const t = useT();
  const resolvedTitle = pageTitle ?? (apiUrl === "/api/clients" ? t.page_clients : t.page_prospects);
  const isClientsView = apiUrl === "/api/clients";
  const viewSource: ListViewSource = isClientsView ? "clients" : "prospects";
  const storageKey = getViewStorageKey(viewSource);
  const [initialListState] = useState(() => readListState(storageKey, viewSource));
  const visibleFilters = isClientsView ? CLIENT_VISIBLE_FILTERS : PROSPECT_VISIBLE_FILTERS;
  const filterStatusOptions = (isClientsView ? CLIENT_STATUS_OPTIONS : PROSPECT_FILTER_STATUS_OPTIONS)
    .map(o => ({ ...o, label: t.status(o.value) }));
  const rowStatusOptions = (isClientsView ? STATUS_OPTIONS : PROSPECT_ROW_STATUS_OPTIONS)
    .map(o => ({ ...o, label: t.status(o.value) }));

  const [filters, setFilters] = useState<Filters>(initialListState.filters);
  const [debouncedSearch, setDebouncedSearch] = useState(initialListState.filters.search);
  const [page, setPage] = useState(() => getInitialPage(initialListState));
  const [pageSize, setPageSize] = useState<number>(initialListState.pageSize);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [emailProspect, setEmailProspect] = useState<Prospect | null>(null);
  const [navIds, setNavIds] = useState<number[]>(initialListState.navIds);
  const [highlightedId, setHighlightedId] = useState<number | null>(
    initialListState.pendingReturnProspectId ?? initialListState.lastViewedProspectId
  );
  const abortRef = useRef<AbortController | null>(null);
  const filterSignatureRef = useRef(buildFilterSignature(initialListState.filters));
  const pendingReturnIdRef = useRef<number | null>(initialListState.pendingReturnProspectId);
  const pendingScrollIdRef = useRef<number | null>(initialListState.pendingReturnProspectId);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Reset page when filters change
  useEffect(() => {
    const signature = buildFilterSignature(filters, debouncedSearch);
    if (signature === filterSignatureRef.current) return;
    filterSignatureRef.current = signature;
    pendingReturnIdRef.current = null;
    pendingScrollIdRef.current = null;
    setPage(1);
    setSelectedIds(new Set());
  }, [filters, debouncedSearch]);

  useEffect(() => {
    const nextFilters = normalizeFiltersForSource(filters, viewSource);
    writeListState(storageKey, {
      filters: nextFilters,
      page,
      pageSize,
      lastViewedProspectId: highlightedId,
      pendingReturnProspectId: pendingReturnIdRef.current,
      navIds,
      updatedAt: Date.now(),
    });
  }, [filters, page, pageSize, highlightedId, navIds, storageKey, viewSource]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (filters.countries.length) params.set("country", filters.countries.join(","));
      if (filters.categories.length) params.set("category", filters.categories.join(","));
      if (filters.statuses.length) params.set("status", filters.statuses.join(","));
      if (!isClientsView && filters.hasEmail !== "all") params.set("hasEmail", filters.hasEmail);
      if (!isClientsView && filters.hasWebsite !== "all") params.set("hasWebsite", filters.hasWebsite);
      if (!isClientsView && filters.listName) params.set("listName", filters.listName);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`${apiUrl}?${params}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error("Failed to fetch prospects.");
      const json = await res.json() as ApiResponse;
      setData(json);
      setNavIds(json.navIds ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error(e);
        setFetchError("Failed to load prospects. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [filters.countries, filters.categories, filters.statuses,
      filters.hasEmail, filters.hasWebsite, filters.listName,
      debouncedSearch, page, pageSize, apiUrl, isClientsView]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(id);
  }, [fetchData]);

  useEffect(() => {
    if (loading || !data) return;
    if (!pendingScrollIdRef.current && data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
      return;
    }

    const pendingId = pendingScrollIdRef.current;
    if (!pendingId) return;

    const currentPageHasPending = data.prospects.some(p => p.id === pendingId);
    if (!currentPageHasPending) {
      const index = data.navIds.indexOf(pendingId);
      if (index >= 0) {
        const targetPage = Math.floor(index / pageSize) + 1;
        if (targetPage !== page) {
          setPage(targetPage);
          return;
        }
      } else {
        pendingReturnIdRef.current = null;
        pendingScrollIdRef.current = null;
        writeListState(storageKey, {
          filters: normalizeFiltersForSource(filters, viewSource),
          page,
          pageSize,
          lastViewedProspectId: highlightedId,
          pendingReturnProspectId: null,
          navIds: data.navIds,
          updatedAt: Date.now(),
        });
        return;
      }
    }

    setHighlightedId(pendingId);
    requestAnimationFrame(() => {
      const target = getVisibleProspectElement(pendingId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    pendingReturnIdRef.current = null;
    pendingScrollIdRef.current = null;
    writeListState(storageKey, {
      filters: normalizeFiltersForSource(filters, viewSource),
      page,
      pageSize,
      lastViewedProspectId: pendingId,
      pendingReturnProspectId: null,
      navIds: data.navIds,
      updatedAt: Date.now(),
    });
  }, [data, filters, highlightedId, loading, navIds, page, pageSize, storageKey, viewSource]);

  // ── Selection ────────────────────────────────────────────────────────────────

  function handleSelect(id: number, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked && data) {
      setSelectedIds(new Set(data.prospects.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  // ── Row actions ──────────────────────────────────────────────────────────────

  async function handleStatusChange(id: number, status: string) {
    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      prospects: prev.prospects.map(p => p.id === id ? { ...p, status } : p),
    } : prev);
    try {
      await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData(); // refresh to apply visibility rules (e.g. proposal_sent disappears from Prospects)
    } catch {
      fetchData(); // revert on error
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t.delete_prospect_short)) return;
    await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    fetchData();
  }

  function handlePageSizeChange(size: number) {
    pendingReturnIdRef.current = null;
    pendingScrollIdRef.current = null;
    setPageSize(size);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handlePageChange(nextPage: number) {
    pendingReturnIdRef.current = null;
    pendingScrollIdRef.current = null;
    setPage(nextPage);
    setSelectedIds(new Set());
  }

  function handleEmailClick(prospect: Prospect) {
    setEmailProspect(prospect);
  }

  function handleOpenDetail(id: number) {
    const nextNavIds = data?.navIds ?? navIds;
    const nextFilters = normalizeFiltersForSource(filters, viewSource);
    setHighlightedId(id);
    pendingReturnIdRef.current = id;
    pendingScrollIdRef.current = id;
    localStorage.setItem(DETAIL_SOURCE_KEY, viewSource);
    writeListState(storageKey, {
      filters: nextFilters,
      page,
      pageSize,
      lastViewedProspectId: id,
      pendingReturnProspectId: id,
      navIds: nextNavIds,
      updatedAt: Date.now(),
    });
  }

  function handleEmailSent(prospectId: number) {
    // Optimistically update status to "contacted" in the visible list
    setData(prev => prev ? {
      ...prev,
      prospects: prev.prospects.map(p =>
        p.id === prospectId && p.status === "new" ? { ...p, status: "contacted" } : p
      ),
    } : prev);
  }

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  async function handleBulkStatusChange(status: string) {
    await fetch("/api/prospects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selectedIds], status }),
    });
    setSelectedIds(new Set());
    fetchData();
  }

  async function handleBulkDelete() {
    if (!window.confirm(t.x_selected(selectedIds.size) + " — " + t.delete_prospect_short)) return;
    await fetch("/api/prospects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selectedIds] }),
    });
    setSelectedIds(new Set());
    fetchData();
  }

  async function downloadCsv(url: string) {
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filenameMatch = /filename="([^"]+)"/.exec(disposition);
    link.href = objectUrl;
    link.download = filenameMatch?.[1] ?? `prospects_demo_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function handleBulkExport() {
    const ids = [...selectedIds].join(",");
    void downloadCsv(`/api/prospects/export?ids=${ids}`);
  }

  function handleExportAll() {
    const params = new URLSearchParams();
    if (filters.countries.length) params.set("country", filters.countries.join(","));
    if (filters.categories.length) params.set("category", filters.categories.join(","));
    if (filters.statuses.length) params.set("status", filters.statuses.join(","));
    if (!isClientsView && filters.hasEmail !== "all") params.set("hasEmail", filters.hasEmail);
    if (!isClientsView && filters.hasWebsite !== "all") params.set("hasWebsite", filters.hasWebsite);
    if (!isClientsView && filters.listName) params.set("listName", filters.listName);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (isClientsView) params.set("source", "clients");
    void downloadCsv(`/api/prospects/export?${params}`);
  }

  const hasActiveFilters =
    filters.statuses.length > 0 || filters.countries.length > 0 ||
    filters.categories.length > 0 || (!isClientsView && filters.hasEmail !== "all") ||
    (!isClientsView && filters.hasWebsite !== "all") || (!isClientsView && !!filters.listName) || !!debouncedSearch;

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8 flex flex-col gap-4 min-h-0">
      <SendEmailModal
        prospect={emailProspect}
        open={!!emailProspect}
        onClose={() => setEmailProspect(null)}
        onSent={handleEmailSent}
      />
      {/* Header */}
      <PageHeader
        title={resolvedTitle}
        description={data ? t.total_count(data.total) : " "}
        actions={
          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            {t.export_view}
          </Button>
        }
      />

      {fetchError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Filters */}
      <ProspectFilters
        filters={filters}
        categories={data?.categories ?? []}
        listNames={data?.listNames ?? []}
        statusOptions={filterStatusOptions}
        visibleFilters={visibleFilters}
        onChange={f => { setFilters(normalizeFiltersForSource(f, viewSource)); }}
      />

      {/* Table */}
      <ProspectTable
        prospects={data?.prospects ?? []}
        total={data?.total ?? 0}
        page={page}
        totalPages={data?.totalPages ?? 1}
        loading={loading}
        hasActiveFilters={hasActiveFilters}
        selectedIds={selectedIds}
        statusOptions={rowStatusOptions}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onStatusChange={handleStatusChange}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkExport={handleBulkExport}
        onBulkDelete={handleBulkDelete}
        onDelete={handleDelete}
        onEmailClick={handleEmailClick}
        onOpenDetail={handleOpenDetail}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        highlightedId={highlightedId}
        detailBasePath={isClientsView ? "/clients" : "/prospects"}
      />
    </div>
  );
}
