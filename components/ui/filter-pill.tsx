import { cn } from "@/lib/utils";
import { TONE_PILL_ACTIVE, TONE_DOT, type Tone } from "@/lib/tones";

/**
 * Toggleable filter pill with a coloured status dot and a count.
 * Shared across grouped list views (Callbacks, Appointments) so the
 * styling is identical everywhere.
 */
export function FilterPill({
  label,
  count,
  tone,
  active,
  onToggle,
}: {
  label: string;
  count: number;
  tone: Tone;
  active: boolean;
  onToggle: () => void;
}) {
  const on = active && count > 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={count === 0}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-control transition-[background-color,border-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-40",
        on ? TONE_PILL_ACTIVE[tone] : "border-zinc-200 bg-white/90 text-zinc-400 hover:border-zinc-300 hover:bg-white hover:text-zinc-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? TONE_DOT[tone] : "bg-zinc-300")} />
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
