export const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "callback", label: "Callback" },
  { value: "not_interested", label: "Not Interested" },
  { value: "no_answer", label: "No Answer" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "client", label: "Client" },
  { value: "archived", label: "Archived" },
] as const;

export type Status = (typeof STATUS_OPTIONS)[number]["value"];

// Filter dropdown options per page context
export const PROSPECT_FILTER_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "callback", label: "Callback" },
  { value: "not_interested", label: "Not Interested" },
  { value: "no_answer", label: "No Answer" },
];

// Inline/bulk status change options on the Prospects page (proposal_sent included for transition)
export const PROSPECT_ROW_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "callback", label: "Callback" },
  { value: "not_interested", label: "Not Interested" },
  { value: "no_answer", label: "No Answer" },
  { value: "proposal_sent", label: "Proposal Sent" },
];

// Status options for the Clients page (filter + inline/bulk change)
export const CLIENT_STATUS_OPTIONS = [
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "client", label: "Client" },
  { value: "archived", label: "Archived" },
];

// Sober status palette — soft 50-tint backgrounds, muted hues, thin inset ring.
// Mirrors the calm two-tone look of the Calendar event chips.
export const STATUS_COLORS: Record<Status, string> = {
  new: "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/15",
  contacted: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15",
  callback: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15",
  not_interested: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-600/15",
  no_answer: "bg-stone-100 text-stone-500 ring-1 ring-inset ring-stone-500/15",
  proposal_sent: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15",
  client: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
  archived: "bg-zinc-100 text-zinc-400 ring-1 ring-inset ring-zinc-400/15",
};

export const COUNTRY_OPTIONS = [
  { value: "CH", label: "Switzerland" },
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgium" },
  { value: "LU", label: "Luxembourg" },
];

export const CSV_COLUMNS = [
  "name",
  "category",
  "address",
  "postal_code",
  "city",
  "country",
  "phone",
  "email",
  "website",
  "gm_link",
  "rating",
  "reviews_count",
  "opening_hours",
  "owner",
  "facebook_url",
  "instagram_url",
  "linkedin_url",
] as const;

// ── Appointments ──────────────────────────────────────────────────────────────

// Durations available for appointments (in minutes)
export const APPOINTMENT_DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
  { value: 75, label: "1h15" },
  { value: 90, label: "1h30" },
  { value: 105, label: "1h45" },
  { value: 120, label: "2h" },
  { value: 135, label: "2h15" },
  { value: 150, label: "2h30" },
  { value: 165, label: "2h45" },
  { value: 180, label: "3h" },
];

export const APPOINTMENT_TYPES = [
  { value: "call", label: "Phone Call" },
  { value: "visio", label: "Video Call" },
];

export const APPOINTMENT_STATUS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Minutes available for the time picker
export const TIME_PICKER_MINUTES = ["00", "15", "30", "45"];

// ── Languages ────────────────────────────────────────────────────────────────
// Two independent axes:
//  - ui_language: language of the CRM interface (labels, menus, buttons)
//  - content_language: language of email templates + signature
export type Language = "en" | "fr";

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

// ── Email template categories (per content language) ─────────────────────────
// Each language has its own ordered category list. Categories are stored as the
// raw string on EmailTemplate.category, so the FR and EN sets are distinct.
export const TEMPLATE_CATEGORIES: Record<Language, string[]> = {
  fr: [
    "Prospection froide",
    "Relances",
    "Téléphone / rendez-vous",
    "Propositions",
    "Projet client",
  ],
  en: [
    "Cold outreach",
    "Follow-ups",
    "Calls / meetings",
    "Proposals",
    "Client project",
  ],
};

// Label for the "no category" group, per language
export const UNCATEGORIZED_LABEL: Record<Language, string> = {
  fr: "Sans catégorie",
  en: "Uncategorized",
};

export function getTemplateCategories(language: string): string[] {
  return TEMPLATE_CATEGORIES[language === "en" ? "en" : "fr"];
}
