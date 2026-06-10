/**
 * Shared semantic tone palette for grouping UI (filter pills + section headers).
 * Used by Callbacks, Appointments, and any future grouped list view so the
 * colours and styling stay identical across the app.
 */

export type Tone = "red" | "amber" | "blue" | "zinc" | "ghost";

/** Filter pill: border + background + text when the pill is active. */
export const TONE_PILL_ACTIVE: Record<Tone, string> = {
  red: "border-rose-200 bg-rose-50/90 text-rose-600 shadow-rose-100/70",
  amber: "border-amber-200 bg-amber-50/90 text-amber-700 shadow-amber-100/70",
  blue: "border-sky-200 bg-sky-50/90 text-sky-700 shadow-sky-100/70",
  zinc: "border-zinc-300 bg-zinc-100/90 text-zinc-700 shadow-zinc-200/70",
  ghost: "border-zinc-200 bg-zinc-50/90 text-zinc-600 shadow-zinc-100/70",
};

/** Filter pill: the small status dot colour when active. */
export const TONE_DOT: Record<Tone, string> = {
  red: "bg-rose-500",
  amber: "bg-amber-500",
  blue: "bg-sky-500",
  zinc: "bg-zinc-400",
  ghost: "bg-zinc-300",
};

/** Section header strip: background + text. */
export const TONE_SECTION: Record<Tone, string> = {
  red: "bg-rose-50/70 text-rose-600",
  amber: "bg-amber-50/70 text-amber-700",
  blue: "bg-sky-50/70 text-sky-700",
  zinc: "bg-zinc-50 text-zinc-600",
  ghost: "bg-zinc-50/70 text-zinc-500",
};
