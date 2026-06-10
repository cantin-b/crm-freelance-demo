import type { CalendarEvent } from "@/types";

// ── Day grid construction ────────────────────────────────────────────────────

/**
 * Returns a 6×7 grid of Date objects for the given month, Monday first.
 * Includes leading days from the previous month and trailing days from the next
 * so every row has 7 cells and the grid always has 6 rows (42 cells total).
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  // JS getDay(): 0=Sun … 6=Sat. Convert to Monday-first index (0=Mon … 6=Sun).
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  // Start at the Monday on/before the 1st of the month.
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Returns the 7 days of the week containing `date`, Monday first. */
export function getWeekDays(date: Date): Date[] {
  const weekday = (date.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }
  return days;
}

// ── Comparisons ──────────────────────────────────────────────────────────────

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// ── Event helpers ────────────────────────────────────────────────────────────

/** All events whose start falls on the given calendar day, sorted by start time. */
export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events
    .filter((e) => isSameDay(new Date(e.start), date))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Converts an event's start/end times to percentage-based top/height for a
 * time grid where the full day (1440 minutes) spans 100% of the column height.
 */
export function getEventPosition(event: CalendarEvent): { top: number; height: number } {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const top = (startMinutes / 1440) * 100;
  const rawHeight = ((Math.max(endMinutes, startMinutes + 1) - startMinutes) / 1440) * 100;
  return { top, height: rawHeight };
}

// ── Formatting (English labels) ──────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "June 2026" */
export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

/** "Jun 1 – 7" (collapses month/year when the week stays within one). */
export function formatWeekRange(date: Date): string {
  const days = getWeekDays(date);
  const first = days[0];
  const last = days[6];
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });

  if (first.getMonth() === last.getMonth()) {
    return `${monthFmt.format(first)} ${first.getDate()} – ${last.getDate()}`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${monthFmt.format(first)} ${first.getDate()} – ${monthFmt.format(last)} ${last.getDate()}`;
  }
  const withYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
  return `${withYear.format(first)} ${first.getDate()} – ${withYear.format(last)} ${last.getDate()}`;
}

/** "Saturday, June 6" */
export function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}
