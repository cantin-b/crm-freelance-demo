"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone, Clock, MessageSquare, Loader2, ArrowDownUp, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { TableSectionHeader } from "@/components/ui/table-section-header";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProspectStatusBadge } from "@/components/prospects/ProspectStatusBadge";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/tones";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Prospect } from "@/types";

// Dates arrive as ISO strings after JSON serialisation from the server
type CallbackProspect = Omit<Prospect, "callback_at" | "created_at" | "updated_at"> & {
  callback_at: string | null;
  created_at: string;
  updated_at: string;
};

interface Props {
  precise: CallbackProspect[];   // have callback_at, sorted asc
  vague: CallbackProspect[];     // have only callback_note, sorted by updated_at desc
}

type GroupKey = "overdue" | "scheduled" | "unscheduled";

interface SavedCallbacksState {
  show: Record<GroupKey, boolean>;
  sortAsc: boolean;
  updatedAt: number;
}

const CALLBACKS_STATE_KEY = "crm_callbacks_state";
const DEFAULT_CALLBACKS_SHOW: Record<GroupKey, boolean> = {
  overdue: true,
  scheduled: true,
  unscheduled: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeCallbacksShow(value: unknown): Record<GroupKey, boolean> {
  const source = typeof value === "object" && value !== null ? value as Partial<Record<GroupKey, unknown>> : {};
  return {
    overdue: typeof source.overdue === "boolean" ? source.overdue : DEFAULT_CALLBACKS_SHOW.overdue,
    scheduled: typeof source.scheduled === "boolean" ? source.scheduled : DEFAULT_CALLBACKS_SHOW.scheduled,
    unscheduled: typeof source.unscheduled === "boolean" ? source.unscheduled : DEFAULT_CALLBACKS_SHOW.unscheduled,
  };
}

function readCallbacksState(): SavedCallbacksState {
  const fallback = { show: DEFAULT_CALLBACKS_SHOW, sortAsc: true, updatedAt: Date.now() };
  if (typeof window === "undefined") return fallback;

  try {
    const saved = JSON.parse(localStorage.getItem(CALLBACKS_STATE_KEY) ?? "null") as Partial<SavedCallbacksState> | null;
    if (saved) {
      return {
        show: sanitizeCallbacksShow(saved.show),
        sortAsc: typeof saved.sortAsc === "boolean" ? saved.sortAsc : true,
        updatedAt: typeof saved.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : Date.now(),
      };
    }
  } catch {
    // Ignore malformed saved state.
  }

  return fallback;
}

function writeCallbacksState(show: Record<GroupKey, boolean>, sortAsc: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CALLBACKS_STATE_KEY, JSON.stringify({
    show,
    sortAsc,
    updatedAt: Date.now(),
  }));
}

function formatCallbackDate(iso: string): { text: string; overdue: boolean } {
  const d = new Date(iso);
  const now = new Date();
  const overdue = d < now;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  let text: string;
  const todayTime = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (d >= startOfToday && d < startOfTomorrow) {
    text = `__today__${todayTime}`;
  } else {
    text = d.toLocaleString("en-GB", {
      weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return { text, overdue };
}

function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

// ── Row ───────────────────────────────────────────────────────────────────────

function CallbackRow({
  prospect: p,
  onAction,
  loadingId,
}: {
  prospect: CallbackProspect;
  onAction: (id: number, status: string) => void;
  loadingId: number | null;
}) {
  const t = useT();
  const isLoading = loadingId === p.id;

  let callbackCell: React.ReactNode;
  if (p.callback_at) {
    const { text, overdue } = formatCallbackDate(p.callback_at);
    const resolvedText = text.startsWith("__today__") ? t.today_at(text.slice(9)) : text;
    callbackCell = (
      <span className={cn("flex items-center gap-1.5", overdue ? "text-rose-600 font-medium" : "text-zinc-700")}>
        <Clock className={cn("w-3.5 h-3.5 shrink-0", overdue ? "text-rose-500" : "text-amber-500")} />
        {resolvedText}
        {overdue && <span className="text-xs font-normal text-rose-400 ml-0.5">{t.overdue_label}</span>}
      </span>
    );
  } else {
    callbackCell = (
      <span className="flex items-center gap-1.5 text-zinc-500 italic">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-300" />
        {p.callback_note || <span className="text-zinc-300 not-italic">—</span>}
      </span>
    );
  }

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50/60">
      {/* Name */}
      <td className="px-4 py-3">
        <Link
          href={`/prospects/${p.id}`}
          className="font-medium text-zinc-900 hover:underline underline-offset-2"
        >
          {p.name}
        </Link>
        {p.category && (
          <p className="text-xs text-zinc-400 mt-0.5">{p.category}</p>
        )}
      </td>

      {/* City */}
      <td className="px-4 py-3 text-sm text-zinc-500">
        {p.city ?? <span className="text-zinc-300">—</span>}
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        {p.phone ? (
          <a
            href={`tel:${p.phone}`}
            className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-brand-navy underline-offset-2 hover:text-brand-red hover:underline"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {p.phone}
          </a>
        ) : (
          <span className="text-zinc-300 text-sm">—</span>
        )}
      </td>

      {/* Callback info */}
      <td className="px-4 py-3 text-sm max-w-64">
        {callbackCell}
      </td>

      {/* Last modified */}
      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
        {formatUpdated(p.updated_at)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          ) : (
            <>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAction(p.id, "contacted")}
              >
                Contacted
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
                onClick={() => onAction(p.id, "not_interested")}
              >
                Not interested
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Mobile compact card ───────────────────────────────────────────────────────

function CallbackCard({ prospect: p }: { prospect: CallbackProspect }) {
  const t = useT();
  let callbackInfo: React.ReactNode = null;
  if (p.callback_at) {
    const { text, overdue } = formatCallbackDate(p.callback_at);
    const resolvedText = text.startsWith("__today__") ? t.today_at(text.slice(9)) : text;
    callbackInfo = (
      <span className={cn("flex items-center gap-1.5 text-sm", overdue ? "font-medium text-rose-600" : "text-zinc-600")}>
        <Clock className={cn("h-3.5 w-3.5 shrink-0", overdue ? "text-rose-500" : "text-amber-500")} />
        {resolvedText}
        {overdue && <span className="text-xs font-normal text-rose-400">{t.overdue_label}</span>}
      </span>
    );
  } else if (p.callback_note) {
    callbackInfo = (
      <span className="flex items-center gap-1.5 text-sm italic text-zinc-500">
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
        {p.callback_note}
      </span>
    );
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-surface">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/prospects/${p.id}`} className="min-w-0">
          <p className="truncate font-medium text-zinc-900">{p.name}</p>
          {p.city && <p className="mt-0.5 truncate text-xs text-zinc-400">{p.city}</p>}
        </Link>
        <ProspectStatusBadge status={p.status} />
      </div>

      {callbackInfo}

      <div className="flex items-center gap-2 border-t border-zinc-100 pt-2.5">
        {p.phone ? (
          <a
            href={`tel:${p.phone}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white active:bg-green-700"
          >
            <Phone className="h-3.5 w-3.5" /> {t.call_mobile}
          </a>
        ) : (
          <span className="text-xs text-zinc-300">{t.no_phone}</span>
        )}

        <Link
          href={`/prospects/${p.id}`}
          className="ml-auto flex h-8 items-center gap-0.5 rounded-md px-2 text-xs font-medium text-zinc-500 active:bg-zinc-100"
        >
          {t.detail_mobile}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Section group (header + its rows) ──────────────────────────────────────────

function SectionGroup({
  group, onAction, loadingId,
}: {
  group: { key: GroupKey; label: string; tone: Tone; rows: CallbackProspect[] };
  onAction: (id: number, status: string) => void;
  loadingId: number | null;
}) {
  return (
    <>
      <TableSectionHeader label={group.label} count={group.rows.length} tone={group.tone} colSpan={6} />
      {group.rows.map(p => (
        <CallbackRow key={p.id} prospect={p} onAction={onAction} loadingId={loadingId} />
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CallbacksView({ precise, vague }: Props) {
  const router = useRouter();
  const t = useT();
  const [initialViewState] = useState(readCallbacksState);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [show, setShow] = useState<Record<GroupKey, boolean>>(initialViewState.show);
  const [sortAsc, setSortAsc] = useState(initialViewState.sortAsc);

  const total = precise.length + vague.length;

  useEffect(() => {
    writeCallbacksState(show, sortAsc);
  }, [show, sortAsc]);

  // Split the dated callbacks into overdue / upcoming relative to now
  const now = Date.now();
  const isOverdue = (p: CallbackProspect) =>
    p.callback_at !== null && new Date(p.callback_at).getTime() < now;

  const dir = sortAsc ? 1 : -1;
  const byDate = (a: CallbackProspect, b: CallbackProspect) =>
    (new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime()) * dir;

  const overdue = precise.filter(isOverdue).sort(byDate);
  const scheduled = precise.filter(p => !isOverdue(p)).sort(byDate);
  const unscheduled = vague; // no date — keep server order (updated_at desc)

  const groups: { key: GroupKey; label: string; tone: Tone; rows: CallbackProspect[] }[] = [
    { key: "overdue", label: t.cb_group_overdue, tone: "red", rows: overdue },
    { key: "scheduled", label: t.cb_group_scheduled, tone: "amber", rows: scheduled },
    { key: "unscheduled", label: t.cb_group_unscheduled, tone: "zinc", rows: unscheduled },
  ];

  const visibleGroups = groups.filter(g => show[g.key] && g.rows.length > 0);
  const visibleCount = visibleGroups.reduce((n, g) => n + g.rows.length, 0);

  async function handleAction(id: number, status: string) {
    setLoadingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed.");
      router.refresh();
    } catch {
      setActionError(t.failed_update_prospect);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-4">
      {/* Header */}
      <PageHeader
        title={t.callbacks_title}
        description={
          total > 0
            ? t.n_prospects_follow_up(total)
            : t.no_callbacks_desc
        }
      />

      {actionError && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 text-sm gap-3">
          <Phone className="w-8 h-8 text-zinc-200" />
          <p>{t.all_caught_up}</p>
        </div>
      ) : (
        <>
          {/* Toolbar: filter pills + sort */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {groups.map(g => (
                <FilterPill
                  key={g.key}
                  tone={g.tone}
                  label={g.label}
                  count={g.rows.length}
                  active={show[g.key]}
                  onToggle={() => setShow(s => ({ ...s, [g.key]: !s[g.key] }))}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 font-normal"
              onClick={() => setSortAsc(v => !v)}
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-zinc-400" />
              {sortAsc ? t.sort_soonest_first : t.sort_latest_first}
            </Button>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden space-y-5">
            {visibleCount === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center text-sm text-zinc-400">
                No callbacks match the selected filters.
              </div>
            ) : (
              visibleGroups.map(g => (
                <div key={g.key} className="space-y-2.5">
                  <p
                    className={cn(
                      "px-1 text-xs font-semibold uppercase tracking-wide",
                      g.tone === "red" ? "text-rose-600" : g.tone === "amber" ? "text-amber-700" : "text-zinc-500"
                    )}
                  >
                    {g.label} · {g.rows.length}
                  </p>
                  {g.rows.map(p => (
                    <CallbackCard key={p.id} prospect={p} />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Table (desktop) */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50/80 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_name}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_city}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_phone}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_callback}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap">{t.col_last_updated}</th>
                  <th className="px-4 py-2.5 w-52" />
                </tr>
              </thead>
              <tbody>
                {visibleCount === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">
                      No callbacks match the selected filters.
                    </td>
                  </tr>
                ) : (
                  visibleGroups.map(g => (
                    <SectionGroup
                      key={g.key}
                      group={g}
                      onAction={handleAction}
                      loadingId={loadingId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
