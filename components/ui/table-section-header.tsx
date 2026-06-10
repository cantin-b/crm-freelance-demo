import { cn } from "@/lib/utils";
import { TONE_SECTION, type Tone } from "@/lib/tones";

/**
 * Full-width section header row inside a grouped table (Callbacks, Appointments).
 * Renders as a single colSpan cell with a tinted background.
 */
export function TableSectionHeader({
  label,
  count,
  tone,
  colSpan,
}: {
  label: string;
  count: number;
  tone: Tone;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          "border-b border-zinc-100/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
          TONE_SECTION[tone]
        )}
      >
        {label} · {count}
      </td>
    </tr>
  );
}
