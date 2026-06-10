import { cn } from "@/lib/utils";

/**
 * Parses the raw `opening_hours` string (as scraped from Google Maps) and
 * renders it as a clean day → hours grid.
 *
 * Raw format example:
 *   "mardi: 07:30 to 17:30 | mercredi: 07:30 to 17:30 | ... | lundi: 07:30 to 17:30"
 *
 * Days are French, ranges use "to", multiple ranges are comma-separated,
 * and a closed day is "Fermé". Google lists days starting at Tuesday, so we
 * re-order to Monday → Sunday for display.
 */

// French day key → canonical order index + English short label
const DAY_MAP: Record<string, { order: number; label: string }> = {
  lundi: { order: 0, label: "Mon" },
  mardi: { order: 1, label: "Tue" },
  mercredi: { order: 2, label: "Wed" },
  jeudi: { order: 3, label: "Thu" },
  vendredi: { order: 4, label: "Fri" },
  samedi: { order: 5, label: "Sat" },
  dimanche: { order: 6, label: "Sun" },
};

// JS getDay() (0=Sun) → canonical order index (0=Mon)
const TODAY_ORDER = (new Date().getDay() + 6) % 7;

interface DayHours {
  key: string;
  label: string;
  order: number;
  hours: string;
  closed: boolean;
}

function parseOpeningHours(raw: string): DayHours[] | null {
  const parts = raw
    .split("|")
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const parsed: DayHours[] = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const rawDay = part.slice(0, idx).trim().toLowerCase();
    const rawHours = part.slice(idx + 1).trim();
    const mapped = DAY_MAP[rawDay];
    if (!mapped) continue;

    const closed = /^ferm/i.test(rawHours) || rawHours === "";
    const hours = closed
      ? "Closed"
      : rawHours.replace(/\s+to\s+/gi, " – ");

    parsed.push({
      key: rawDay,
      label: mapped.label,
      order: mapped.order,
      hours,
      closed,
    });
  }

  if (parsed.length === 0) return null;
  return parsed.sort((a, b) => a.order - b.order);
}

export function OpeningHours({ value }: { value: string }) {
  const days = parseOpeningHours(value);

  // Fall back to the raw string if we can't parse a recognizable structure
  if (!days) {
    return <p className="text-sm text-zinc-700">{value}</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200">
      {days.map((d, i) => {
        const isToday = d.order === TODAY_ORDER;
        return (
          <div
            key={d.key}
            className={cn(
              "flex items-center justify-between px-3 py-1.5 text-sm",
              i !== days.length - 1 && "border-b border-zinc-100",
              isToday && "bg-brand-navy/5"
            )}
          >
            <span
              className={cn(
                "flex items-center gap-1.5 font-medium",
                isToday ? "text-brand-navy" : "text-zinc-600"
              )}
            >
              {d.label}
              {isToday && (
                <span className="rounded-full bg-brand-navy/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                  Today
                </span>
              )}
            </span>
            <span
              className={cn(
                "tabular-nums",
                d.closed ? "text-zinc-400" : "text-zinc-700"
              )}
            >
              {d.hours}
            </span>
          </div>
        );
      })}
    </div>
  );
}
