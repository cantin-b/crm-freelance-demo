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

const PROSPECT_WORKFLOW_STATUS_VALUES: Status[] = [
  "new",
  "contacted",
  "callback",
  "not_interested",
  "no_answer",
  "proposal_sent",
];

const STATUS_TRANSITIONS: Partial<Record<Status, Status[]>> = {
  proposal_sent: ["proposal_sent", "client", "not_interested"],
  client: ["client", "archived"],
  archived: ["archived", "client"],
};

export function getAllowedStatusValues(currentStatus: string): Status[] {
  if (currentStatus in STATUS_TRANSITIONS) {
    return STATUS_TRANSITIONS[currentStatus as Status] ?? [];
  }
  return PROSPECT_WORKFLOW_STATUS_VALUES;
}

export function getAllowedStatusOptions(currentStatus: string) {
  const allowed = new Set(getAllowedStatusValues(currentStatus));
  return STATUS_OPTIONS.filter(option => allowed.has(option.value));
}

export function getCommonAllowedStatusOptions(currentStatuses: string[]) {
  if (currentStatuses.length === 0) return STATUS_OPTIONS;
  const [firstStatus, ...restStatuses] = currentStatuses;
  const common = new Set(getAllowedStatusValues(firstStatus));
  for (const status of restStatuses) {
    const allowed = new Set(getAllowedStatusValues(status));
    for (const value of [...common]) {
      if (!allowed.has(value)) common.delete(value);
    }
  }
  return STATUS_OPTIONS.filter(option => common.has(option.value));
}

export function isHighValueStatus(status: string) {
  return status === "proposal_sent" || status === "client" || status === "archived";
}

export function isAllowedStatusTransition(currentStatus: string, nextStatus: string) {
  return getAllowedStatusValues(currentStatus).includes(nextStatus as Status);
}

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

export type CountryRegion = "europe" | "asia" | "north_america" | "oceania";

export const COUNTRY_REGION_ORDER: CountryRegion[] = ["europe", "asia", "north_america", "oceania"];

export const COUNTRY_OPTIONS: { value: string; label: string; region: CountryRegion }[] = [
  { value: "AT", label: "Austria", region: "europe" },
  { value: "BE", label: "Belgium", region: "europe" },
  { value: "BG", label: "Bulgaria", region: "europe" },
  { value: "HR", label: "Croatia", region: "europe" },
  { value: "CY", label: "Cyprus", region: "europe" },
  { value: "CZ", label: "Czechia", region: "europe" },
  { value: "DK", label: "Denmark", region: "europe" },
  { value: "EE", label: "Estonia", region: "europe" },
  { value: "FI", label: "Finland", region: "europe" },
  { value: "FR", label: "France", region: "europe" },
  { value: "DE", label: "Germany", region: "europe" },
  { value: "GR", label: "Greece", region: "europe" },
  { value: "HU", label: "Hungary", region: "europe" },
  { value: "IE", label: "Ireland", region: "europe" },
  { value: "IT", label: "Italy", region: "europe" },
  { value: "LV", label: "Latvia", region: "europe" },
  { value: "LT", label: "Lithuania", region: "europe" },
  { value: "LU", label: "Luxembourg", region: "europe" },
  { value: "MT", label: "Malta", region: "europe" },
  { value: "NL", label: "Netherlands", region: "europe" },
  { value: "NO", label: "Norway", region: "europe" },
  { value: "PL", label: "Poland", region: "europe" },
  { value: "PT", label: "Portugal", region: "europe" },
  { value: "RO", label: "Romania", region: "europe" },
  { value: "SK", label: "Slovakia", region: "europe" },
  { value: "SI", label: "Slovenia", region: "europe" },
  { value: "ES", label: "Spain", region: "europe" },
  { value: "SE", label: "Sweden", region: "europe" },
  { value: "CH", label: "Switzerland", region: "europe" },
  { value: "GB", label: "United Kingdom", region: "europe" },
  { value: "CN", label: "China", region: "asia" },
  { value: "JP", label: "Japan", region: "asia" },
  { value: "SG", label: "Singapore", region: "asia" },
  { value: "KR", label: "South Korea", region: "asia" },
  { value: "TW", label: "Taiwan", region: "asia" },
  { value: "TH", label: "Thailand", region: "asia" },
  { value: "CA", label: "Canada", region: "north_america" },
  { value: "US", label: "United States", region: "north_america" },
  { value: "AU", label: "Australia", region: "oceania" },
  { value: "NZ", label: "New Zealand", region: "oceania" },
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
