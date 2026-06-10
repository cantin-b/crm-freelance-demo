"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Phone, CheckCircle2, RotateCcw, ExternalLink, Video,
  ArrowDownUp, ChevronRight, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { TableSectionHeader } from "@/components/ui/table-section-header";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { APPOINTMENT_DURATIONS } from "@/lib/constants";
import type { Tone } from "@/lib/tones";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { AppointmentWithProspect } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

type ApptGroupKey = "today" | "thisWeek" | "upcoming" | "past";

interface SavedAppointmentsState {
  show: Record<ApptGroupKey, boolean>;
  sortAsc: boolean;
  updatedAt: number;
}

const APPOINTMENTS_STATE_KEY = "crm_appointments_state";
const DEFAULT_APPOINTMENTS_SHOW: Record<ApptGroupKey, boolean> = {
  today: true,
  thisWeek: true,
  upcoming: true,
  past: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitizeAppointmentsShow(value: unknown): Record<ApptGroupKey, boolean> {
  const source = typeof value === "object" && value !== null ? value as Partial<Record<ApptGroupKey, unknown>> : {};
  return {
    today: typeof source.today === "boolean" ? source.today : DEFAULT_APPOINTMENTS_SHOW.today,
    thisWeek: typeof source.thisWeek === "boolean" ? source.thisWeek : DEFAULT_APPOINTMENTS_SHOW.thisWeek,
    upcoming: typeof source.upcoming === "boolean" ? source.upcoming : DEFAULT_APPOINTMENTS_SHOW.upcoming,
    past: typeof source.past === "boolean" ? source.past : DEFAULT_APPOINTMENTS_SHOW.past,
  };
}

function readAppointmentsState(): SavedAppointmentsState {
  const fallback = { show: DEFAULT_APPOINTMENTS_SHOW, sortAsc: true, updatedAt: Date.now() };
  if (typeof window === "undefined") return fallback;

  try {
    const saved = JSON.parse(localStorage.getItem(APPOINTMENTS_STATE_KEY) ?? "null") as Partial<SavedAppointmentsState> | null;
    if (saved) {
      return {
        show: sanitizeAppointmentsShow(saved.show),
        sortAsc: typeof saved.sortAsc === "boolean" ? saved.sortAsc : true,
        updatedAt: typeof saved.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : Date.now(),
      };
    }
  } catch {
    // Ignore malformed saved state.
  }

  return fallback;
}

function writeAppointmentsState(show: Record<ApptGroupKey, boolean>, sortAsc: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPOINTMENTS_STATE_KEY, JSON.stringify({
    show,
    sortAsc,
    updatedAt: Date.now(),
  }));
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatDateTime(iso: string): { text: string; color: "red" | "orange" | "normal" } {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d);
  const weekdayClean = weekday.replace(/\.$/, "");
  const weekdayCap = weekdayClean.charAt(0).toUpperCase() + weekdayClean.slice(1);
  const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(d);
  const time = `${pad(d.getHours())}h${pad(d.getMinutes())}`;
  const text = `${weekdayCap} ${dayMonth} · ${time}`;

  let color: "red" | "orange" | "normal" = "normal";
  if (d >= todayStart && d < todayEnd) color = "red";
  else if (d >= now && d < in24h) color = "orange";

  return { text, color };
}

function durationLabel(minutes: number): string {
  return APPOINTMENT_DURATIONS.find((d) => d.value === minutes)?.label ?? `${minutes} min`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── Type badge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type, meetLink }: { type: string; meetLink?: string | null }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
          type === "call"
            ? "bg-sky-50 text-sky-700 ring-sky-600/15"
            : "bg-violet-50 text-violet-700 ring-violet-600/15"
        )}
      >
        {type === "visio" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
        {t.appt_type(type)}
      </span>
      {type === "visio" && meetLink && (
        <a
          href={meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 transition-colors hover:text-sky-600"
          title={meetLink}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}


// ── Desktop row ────────────────────────────────────────────────────────────────

function AppointmentRow({
  appt,
  onAction,
}: {
  appt: AppointmentWithProspect;
  onAction: (id: number, status: string) => void;
}) {
  const t = useT();
  const { text, color } = formatDateTime(appt.date);
  const { prospect } = appt;

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50/60">
      {/* Name */}
      <td className="px-4 py-3">
        <Link
          href={`/prospects/${prospect.id}`}
          className="font-medium text-zinc-900 hover:underline underline-offset-2"
        >
          {prospect.name}
        </Link>
        {prospect.city && (
          <p className="text-xs text-zinc-400 mt-0.5">{prospect.city}</p>
        )}
      </td>

      {/* Date & Time */}
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <span
          className={cn(
            color === "red"    ? "text-red-600 font-medium" :
            color === "orange" ? "text-amber-600 font-medium" :
            "text-zinc-600"
          )}
        >
          {text}
        </span>
      </td>

      {/* Duration */}
      <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">
        {durationLabel(appt.duration)}
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <TypeBadge type={appt.type} meetLink={appt.meet_link} />
      </td>

      {/* Notes */}
      <td className="px-4 py-3 max-w-48">
        {appt.notes ? (
          <span className="block truncate text-sm text-zinc-400">{appt.notes}</span>
        ) : (
          <span className="text-sm text-zinc-200">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          {prospect.phone && (
            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700">
              <a href={`tel:${prospect.phone}`} title={prospect.phone}>
                <Phone className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {appt.status === "scheduled" ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => onAction(appt.id, "completed")}
              title="Mark appointment as completed"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t.mark_complete}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
              onClick={() => onAction(appt.id, "scheduled")}
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t.reopen}
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-700">
            <Link href={`/prospects/${prospect.id}`} title="Open prospect">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Mobile card ────────────────────────────────────────────────────────────────

function AppointmentMobileCard({
  appt,
  onAction,
}: {
  appt: AppointmentWithProspect;
  onAction: (id: number, status: string) => void;
}) {
  const t = useT();
  const { text, color } = formatDateTime(appt.date);
  const { prospect } = appt;

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-surface">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/prospects/${prospect.id}`} className="min-w-0">
          <p className="truncate font-medium text-zinc-900">{prospect.name}</p>
          {prospect.city && <p className="mt-0.5 truncate text-xs text-zinc-400">{prospect.city}</p>}
        </Link>
        <TypeBadge type={appt.type} />
      </div>

      <p
        className={cn(
          "text-sm",
          color === "red"    ? "font-medium text-red-600" :
          color === "orange" ? "font-medium text-amber-600" :
          "text-zinc-600"
        )}
      >
        {text} · {durationLabel(appt.duration)}
      </p>

      {appt.notes && (
        <p className="truncate text-sm text-zinc-400">{appt.notes}</p>
      )}

      <div className="flex items-center gap-2 border-t border-zinc-100 pt-2.5">
        {prospect.phone && (
          <a
            href={`tel:${prospect.phone}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white active:bg-green-700"
          >
            <Phone className="h-3.5 w-3.5" /> Appeler
          </a>
        )}
        <Link
          href={`/prospects/${prospect.id}`}
          className="inline-flex items-center gap-0.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 active:bg-zinc-100"
        >
          {t.detail_mobile} <ChevronRight className="h-4 w-4" />
        </Link>
        {appt.status === "scheduled" && (
          <button
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 active:bg-emerald-50"
            onClick={() => onAction(appt.id, "completed")}
            title="Mark appointment as completed"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {t.mark_complete}
          </button>
        )}
        {(appt.status === "completed" || appt.status === "cancelled") && (
          <button
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 active:bg-zinc-50"
            onClick={() => onAction(appt.id, "scheduled")}
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t.reopen}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AppointmentsView({ appointments: initial }: { appointments: AppointmentWithProspect[] }) {
  const t = useT();
  const [initialViewState] = useState(readAppointmentsState);
  const [appointments, setAppointments] = useState<AppointmentWithProspect[]>(initial);
  const [show, setShow] = useState<Record<ApptGroupKey, boolean>>(initialViewState.show);
  const [sortAsc, setSortAsc] = useState(initialViewState.sortAsc);

  useEffect(() => {
    writeAppointmentsState(show, sortAsc);
  }, [show, sortAsc]);

  async function handleAction(id: number, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  const groups = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const today: AppointmentWithProspect[] = [];
    const thisWeek: AppointmentWithProspect[] = [];
    const upcoming: AppointmentWithProspect[] = [];
    const past: AppointmentWithProspect[] = [];

    for (const a of appointments) {
      const d = new Date(a.date);
      if (a.status === "completed" || a.status === "cancelled") {
        past.push(a);
      } else if (isSameDay(d, todayStart)) {
        today.push(a);
      } else if (d > todayStart && d <= weekEnd) {
        thisWeek.push(a);
      } else {
        upcoming.push(a);
      }
    }

    const dir = sortAsc ? 1 : -1;
    const byDate = (a: AppointmentWithProspect, b: AppointmentWithProspect) =>
      (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;

    today.sort(byDate);
    thisWeek.sort(byDate);
    upcoming.sort(byDate);
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { today, thisWeek, upcoming, past };
  }, [appointments, sortAsc]);

  const groupDefs: { key: ApptGroupKey; label: string; tone: Tone; rows: AppointmentWithProspect[] }[] = [
    { key: "today",    label: t.group_today,     tone: "blue",  rows: groups.today },
    { key: "thisWeek", label: t.group_this_week, tone: "amber", rows: groups.thisWeek },
    { key: "upcoming", label: t.group_upcoming,  tone: "zinc",  rows: groups.upcoming },
    { key: "past",     label: t.group_past,      tone: "ghost", rows: groups.past },
  ];

  const scheduledCount = useMemo(
    () => appointments.filter((a) => a.status === "scheduled").length,
    [appointments]
  );

  const visibleGroupsWithRows = groupDefs.filter((g) => show[g.key] && g.rows.length > 0);
  const hasVisible = visibleGroupsWithRows.length > 0;

  return (
    <div className="p-6 md:p-8 flex flex-col gap-4">
      <PageHeader
        title={t.appointments_title}
        description={
          scheduledCount > 0
            ? t.n_scheduled_appointments(scheduledCount)
            : t.no_scheduled_appointments
        }
      />

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 text-sm gap-3">
          <CalendarDays className="w-8 h-8 text-zinc-200" />
          <p>{t.no_appointments_yet}</p>
        </div>
      ) : (
        <>
          {/* Toolbar: filter pills + sort */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {groupDefs.map((g) => (
                <FilterPill
                  key={g.key}
                  tone={g.tone}
                  label={g.label}
                  count={g.rows.length}
                  active={show[g.key]}
                  onToggle={() => setShow((s) => ({ ...s, [g.key]: !s[g.key] }))}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 font-normal"
              onClick={() => setSortAsc((v) => !v)}
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-zinc-400" />
              {sortAsc ? t.sort_soonest_first : t.sort_latest_first}
            </Button>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-5">
            {!hasVisible ? (
              <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center text-sm italic text-zinc-400">
                No appointments in this period.
              </div>
            ) : (
              visibleGroupsWithRows.map((g) => (
                <div key={g.key} className="space-y-2.5">
                  <p
                    className={cn(
                      "px-1 text-xs font-semibold uppercase tracking-wide",
                      g.tone === "blue"  ? "text-blue-700" :
                      g.tone === "amber" ? "text-amber-700" :
                      "text-zinc-500"
                    )}
                  >
                    {g.label} · {g.rows.length}
                  </p>
                  {g.rows.map((a) => (
                    <AppointmentMobileCard key={a.id} appt={a} onAction={handleAction} />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50/80 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_name}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap">{t.col_date_time}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_duration}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_type}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_notes}</th>
                  <th className="px-4 py-2.5 w-52" />
                </tr>
              </thead>
              <tbody>
                {!hasVisible ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm italic text-zinc-400">
                      No appointments in this period.
                    </td>
                  </tr>
                ) : (
                  visibleGroupsWithRows.map((g) => (
                    <React.Fragment key={g.key}>
                      <TableSectionHeader label={g.label.toUpperCase()} count={g.rows.length} tone={g.tone} colSpan={6} />
                      {g.rows.map((a) => (
                        <AppointmentRow key={a.id} appt={a} onAction={handleAction} />
                      ))}
                    </React.Fragment>
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
