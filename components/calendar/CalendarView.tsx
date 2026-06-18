"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone, ArrowRight, ExternalLink, Video, MessageSquare, CalendarRange,
  Loader2, ChevronLeft, ChevronRight, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { recordDemoCall } from "@/lib/demoActivityClient";
import {
  getMonthGrid, getWeekDays, isSameMonth, isToday,
  getEventsForDay, getEventPosition, formatTime, formatMonthLabel,
  formatWeekRange, formatDayLabel,
} from "@/lib/calendarUtils";
import type { CalendarEvent, CalendarEventType } from "@/types";

// ── Constants ────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";
type FilterKey = "all" | CalendarEventType;

interface SavedCalendarState {
  filter: FilterKey;
  view: ViewMode;
  currentDate: string;
  updatedAt: number;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56; // px per hour in the time grid (Google ≈ 48–60)
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;
const CALENDAR_STATE_KEY = "crm_calendar_state";
const FILTER_KEYS: FilterKey[] = ["all", "appointment", "callback"];
const VIEW_MODES: ViewMode[] = ["month", "week", "day"];

const PILL_STYLES: Record<FilterKey, { dot: string; active: string }> = {
  all:         { dot: "bg-zinc-400",   active: "border-zinc-300 bg-zinc-100 text-zinc-700" },
  appointment: { dot: "bg-blue-500",   active: "border-blue-200 bg-blue-50 text-blue-700" },
  callback:    { dot: "bg-orange-500", active: "border-orange-200 bg-orange-50 text-orange-700" },
};

// Solid block (time grid) vs left-accent chip (month) colors
const EVENT_SOLID: Record<CalendarEventType, string> = {
  appointment: "bg-blue-500 text-white hover:bg-blue-600",
  callback: "bg-orange-500 text-white hover:bg-orange-600",
};
const EVENT_ACCENT: Record<CalendarEventType, string> = {
  appointment: "bg-blue-50 text-blue-900 hover:bg-blue-100 border-l-2 border-blue-500",
  callback: "bg-orange-50 text-orange-900 hover:bg-orange-100 border-l-2 border-orange-500",
};
const EVENT_DOT: Record<CalendarEventType, string> = {
  appointment: "bg-blue-500",
  callback: "bg-orange-500",
};

// ── Small helpers ────────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function sanitizeFilter(value: unknown): FilterKey {
  return FILTER_KEYS.includes(value as FilterKey) ? value as FilterKey : "all";
}

function sanitizeView(value: unknown): ViewMode {
  return VIEW_MODES.includes(value as ViewMode) ? value as ViewMode : "month";
}

function readCalendarState(): SavedCalendarState {
  const today = formatDateKey(new Date());
  const fallback = { filter: "all" as FilterKey, view: "month" as ViewMode, currentDate: today, updatedAt: Date.now() };
  if (typeof window === "undefined") return fallback;

  try {
    const saved = JSON.parse(localStorage.getItem(CALENDAR_STATE_KEY) ?? "null") as Partial<SavedCalendarState> | null;
    if (saved) {
      return {
        filter: sanitizeFilter(saved.filter),
        view: sanitizeView(saved.view),
        currentDate: parseDateKey(saved.currentDate) ? saved.currentDate! : today,
        updatedAt: typeof saved.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : Date.now(),
      };
    }
  } catch {
    // Ignore malformed saved state.
  }

  return fallback;
}

function writeCalendarState(filter: FilterKey, view: ViewMode, currentDate: Date) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CALENDAR_STATE_KEY, JSON.stringify({
    filter,
    view,
    currentDate: formatDateKey(currentDate),
    updatedAt: Date.now(),
  }));
}

function durationText(minutes?: number): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function formatFullDateTime(d: Date): string {
  const datePart = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(d);
  return `${datePart} · ${formatTime(d)}`;
}

// ── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  filterKey, label, count, active, onClick,
}: {
  filterKey: FilterKey;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const style = PILL_STYLES[filterKey];
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none",
        active ? style.active : "border-zinc-200 bg-white text-zinc-400 hover:text-zinc-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? style.dot : "bg-zinc-300")} />
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

// ── Time-grid event block (week / day) ───────────────────────────────────────

function TimeGridEvent({
  event, onClick, compact,
}: {
  event: CalendarEvent;
  onClick: () => void;
  compact?: boolean;
}) {
  const { top, height } = getEventPosition(event);
  const Icon = event.type === "appointment" ? CalendarDays : Phone;
  const start = new Date(event.start);
  const end = new Date(event.end);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        top: `${(top / 100) * GRID_HEIGHT}px`,
        height: `${Math.max(22, (height / 100) * GRID_HEIGHT)}px`,
      }}
      className={cn(
        "absolute inset-x-0.5 z-10 overflow-hidden rounded-lg px-2 py-1 text-left leading-tight shadow-sm ring-1 ring-black/5 transition-colors focus:outline-none",
        EVENT_SOLID[event.type]
      )}
    >
      <span className="flex items-center gap-1 text-[11px] font-semibold">
        <Icon className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{event.meta.prospectName}</span>
      </span>
      {!compact && (
        <span className="block truncate text-[10px] opacity-90">
          {formatTime(start)} – {formatTime(end)}
        </span>
      )}
    </button>
  );
}

// ── Current-time indicator ───────────────────────────────────────────────────

function CurrentTimeLine({ now }: { now: Date }) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = (minutes / 1440) * GRID_HEIGHT;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: `${top}px` }}>
      <div className="relative">
        <span className="absolute -left-1.25 -top-1.25 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        <div className="h-0.5 w-full bg-red-500" />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CalendarView() {
  const [initialViewState] = useState(readCalendarState);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState<FilterKey>(initialViewState.filter);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<ViewMode>(initialViewState.view);
  const [currentDate, setCurrentDate] = useState(() => parseDateKey(initialViewState.currentDate) ?? new Date());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    writeCalendarState(filter, view, currentDate);
  }, [filter, view, currentDate]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/calendar");
        const data: { events: CalendarEvent[] } = await res.json();
        if (!cancelled) setEvents(data.events);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    let appointment = 0, callback = 0;
    for (const e of events) {
      if (e.type === "appointment") appointment++;
      else callback++;
    }
    return { all: events.length, appointment, callback };
  }, [events]);

  const eventsToShow = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.type === filter)),
    [events, filter]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goToday() { setCurrentDate(new Date()); }

  function navigate(direction: -1 | 1) {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      else if (view === "week") next.setDate(next.getDate() + direction * 7);
      else next.setDate(next.getDate() + direction);
      return next;
    });
  }

  // Open the day view for a given date (clicking a month/week cell).
  function openDay(date: Date) {
    setCurrentDate(date);
    setView("day");
  }

  const periodLabel =
    view === "month" ? formatMonthLabel(currentDate)
    : view === "week" ? formatWeekRange(currentDate)
    : formatDayLabel(currentDate);

  const meta = selectedEvent?.meta;
  const isAppointment = selectedEvent?.type === "appointment";

  // Available views differ by breakpoint; mobile = Month + Day only.
  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar (fixed) ── */}
      <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: nav */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={goToday}>
              Today
            </Button>
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                aria-label="Previous"
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 focus:outline-none"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate(1)}
                aria-label="Next"
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 focus:outline-none"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <h2 className="ml-1 text-lg font-semibold text-zinc-900 md:text-xl">{periodLabel}</h2>
          </div>

          {/* Right: view switcher (Week hidden on mobile) */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <ViewTab label="Month" active={view === "month"} onClick={() => setView("month")} />
            <ViewTab label="Week" active={view === "week"} onClick={() => setView("week")} className="hidden md:inline-flex" />
            <ViewTab label="Day" active={view === "day"} onClick={() => setView("day")} />
          </div>
        </div>

        {/* Filter pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterPill filterKey="all" label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterPill filterKey="appointment" label="Appointments" count={counts.appointment} active={filter === "appointment"} onClick={() => setFilter("appointment")} />
          <FilterPill filterKey="callback" label="Callbacks" count={counts.callback} active={filter === "callback"} onClick={() => setFilter("callback")} />
        </div>
      </div>

      {/* ── Calendar body (fills remaining height) ── */}
      <div className="min-h-0 flex-1 bg-white">
        {loading ? (
          <div className="flex h-full items-center justify-center text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-400">
            <CalendarRange className="h-8 w-8 text-zinc-200" />
            <p>No appointments or callbacks scheduled yet.</p>
          </div>
        ) : view === "month" ? (
          <MonthGrid
            date={currentDate}
            events={eventsToShow}
            onSelectEvent={setSelectedEvent}
            onSelectDay={openDay}
          />
        ) : (
          <TimeGrid
            days={view === "week" ? getWeekDays(currentDate) : [currentDate]}
            events={eventsToShow}
            now={now}
            onSelectEvent={setSelectedEvent}
            onSelectDay={openDay}
            singleDay={view === "day"}
          />
        )}
      </div>

      {/* ── Event detail dialog ── */}
      <Dialog open={selectedEvent !== null} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          {selectedEvent && meta && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">
                  {isAppointment ? selectedEvent.title.split(" — ")[0] : `Callback — ${meta.prospectName}`}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div>
                  <Link
                    href={`/prospects/${meta.prospectId}`}
                    className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                  >
                    {meta.prospectName}
                  </Link>
                  {meta.city && <p className="mt-0.5 text-xs text-zinc-400">{meta.city}</p>}
                </div>

                <p className="text-zinc-600">
                  {formatFullDateTime(new Date(selectedEvent.start))}
                  {isAppointment && meta.duration ? ` · ${durationText(meta.duration)}` : ""}
                </p>

                {isAppointment && (
                  <>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        meta.appointmentType === "call" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                      )}
                    >
                      {meta.appointmentType === "visio" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                      {meta.appointmentType === "call" ? "Phone Call" : "Video Call"}
                    </span>
                    {meta.meetLink && (
                      <a
                        href={meta.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {meta.meetLink.replace(/^https?:\/\//, "").split("/")[0]}
                      </a>
                    )}
                    {meta.notes && <p className="text-zinc-500">{meta.notes}</p>}
                  </>
                )}

                {!isAppointment && meta.callbackNote && (
                  <p className="flex items-start gap-1.5 italic text-zinc-500">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300" />
                    {meta.callbackNote}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-zinc-100 pt-4">
                {meta.phone && (
                  <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                    <a href={`tel:${meta.phone}`} onClick={() => recordDemoCall(meta.prospectId)}>
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  </Button>
                )}
                <Button asChild size="sm" className="ml-auto h-8 gap-1.5">
                  <Link href={`/prospects/${meta.prospectId}`}>
                    View prospect <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── View tab ─────────────────────────────────────────────────────────────────

function ViewTab({
  label, active, onClick, className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex rounded-md px-3 py-1 text-xs font-medium transition-colors focus:outline-none",
        active ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5" : "text-zinc-500 hover:text-zinc-800",
        className
      )}
    >
      {label}
    </button>
  );
}

// ── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  date, events, onSelectEvent, onSelectDay,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectDay: (d: Date) => void;
}) {
  const weeks = useMemo(() => getMonthGrid(date.getFullYear(), date.getMonth()), [date]);

  return (
    <div className="flex h-full flex-col">
      {/* Weekday header */}
      <div className="grid shrink-0 grid-cols-7 border-b border-zinc-200">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-zinc-100 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400 last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Weeks — fill remaining height */}
      <div className="grid min-h-0 flex-1 auto-rows-fr">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-zinc-100 last:border-b-0">
            {week.map((day) => {
              const dayEvents = getEventsForDay(events, day);
              const inMonth = isSameMonth(day, date);
              const today = isToday(day);
              const visible = dayEvents.slice(0, 3);
              const extra = dayEvents.length - visible.length;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "group flex flex-col gap-0.5 overflow-hidden border-r border-zinc-100 p-1 text-left transition-colors last:border-r-0 hover:bg-zinc-50 focus:outline-none",
                    !inMonth && "bg-zinc-50/50"
                  )}
                >
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors",
                        today && "bg-blue-600 font-semibold text-white",
                        !today && inMonth && "text-zinc-700 group-hover:bg-zinc-200/70",
                        !today && !inMonth && "text-zinc-300"
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  {/* Desktop: event chips (clickable → modal). Cell click → day view. */}
                  <div className="hidden flex-col gap-0.5 md:flex">
                    {visible.map((e) => {
                      const Icon = e.type === "appointment" ? CalendarDays : Phone;
                      return (
                        <span
                          key={e.id}
                          role="button"
                          tabIndex={0}
                          onClick={(ev) => { ev.stopPropagation(); onSelectEvent(e); }}
                          onKeyDown={(ev) => { if (ev.key === "Enter") { ev.stopPropagation(); onSelectEvent(e); } }}
                          title={`${formatTime(new Date(e.start))} ${e.meta.prospectName}`}
                          className={cn(
                            "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-colors",
                            EVENT_ACCENT[e.type]
                          )}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0 opacity-70" />
                          <span className="truncate">
                            <span className="tabular-nums opacity-60">{formatTime(new Date(e.start))}</span>{" "}
                            {e.meta.prospectName}
                          </span>
                        </span>
                      );
                    })}
                    {extra > 0 && (
                      <span className="px-1.5 text-[11px] font-medium text-zinc-400">
                        + {extra} more
                      </span>
                    )}
                  </div>

                  {/* Mobile: colored dots only — tapping the cell opens the day view. */}
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1 md:hidden">
                      {dayEvents.slice(0, 4).map((e) => (
                        <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", EVENT_DOT[e.type])} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Time grid (week / day) ───────────────────────────────────────────────────

function TimeGrid({
  days, events, now, onSelectEvent, onSelectDay, singleDay,
}: {
  days: Date[];
  events: CalendarEvent[];
  now: Date;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectDay: (d: Date) => void;
  singleDay?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnchor = days[0]?.toDateString();

  // Scroll to ~07:30 on mount / view change so the work day is centered.
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7.5 * HOUR_HEIGHT - 16;
    }
  }, [singleDay, scrollAnchor]);

  return (
    <div className="flex h-full flex-col">
      {/* Sticky column header */}
      <div className="flex shrink-0 border-b border-zinc-200">
        <div className="w-16 shrink-0 border-r border-zinc-100" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className="flex-1 border-r border-zinc-100 py-2 text-center transition-colors last:border-r-0 hover:bg-zinc-50 focus:outline-none"
            >
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 flex items-center justify-center rounded-full text-sm",
                  singleDay ? "h-9 w-9 text-base" : "h-8 w-8",
                  today ? "bg-blue-600 font-semibold text-white" : "font-medium text-zinc-700"
                )}
              >
                {day.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scrollable time area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${GRID_HEIGHT}px` }}>
          {/* Hour gutter */}
          <div className="w-16 shrink-0 border-r border-zinc-100">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                {h !== 0 && (
                  <span className="absolute -top-2 right-2 text-[11px] font-medium text-zinc-400">
                    {String(h).padStart(2, "0")}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayEvents = getEventsForDay(events, day);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                onClick={() => { if (!singleDay) onSelectDay(day); }}
                className={cn(
                  "relative flex-1 border-r border-zinc-100 last:border-r-0",
                  today && "bg-blue-50/30",
                  !singleDay && "cursor-pointer"
                )}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-t border-zinc-100 first:border-t-0"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}
                {/* Events */}
                {dayEvents.map((e) => (
                  <TimeGridEvent key={e.id} event={e} onClick={() => onSelectEvent(e)} compact={!singleDay && days.length > 1} />
                ))}
                {/* Current time line */}
                {today && <CurrentTimeLine now={now} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
