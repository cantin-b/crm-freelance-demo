@AGENTS.md

# Freelance CRM — Claude Context

Personal prospecting CRM for cold outreach to tradespeople (painters, plumbers, electricians, etc.) across French-speaking countries. Single-user, password-protected, SQLite on disk.

## Stack

| Layer | Version | Notes |
|---|---|---|
| Next.js | 16.2.7 | App Router, no Pages Router |
| Prisma | 7.x | `prisma-client` generator, NOT `prisma-client-js` |
| SQLite | via `better-sqlite3` | DB at `prisma/dev.db` |
| Tailwind | v4 | `@import "tailwindcss"` syntax, `@theme inline` |
| shadcn/ui | latest | zinc base color, components in `components/ui/` |
| TipTap | 2.x | Rich text for email templates |
| Lucide React | 1.17.0 | No social media icons in this version |
| jose | latest | JWT signing/verification for session auth |
| bcryptjs | latest | Password hashing |
| Calendar | — | Custom month/week/day views — no external calendar library (removed `react-big-calendar` + `date-fns`); date math lives in `lib/calendarUtils.ts` |
| i18n | — | Custom context-based system, no external library — `lib/i18n.ts` + `useT()` hook |

## Critical gotchas

### Prisma 7.x
- Uses `prisma-client` generator (not `prisma-client-js`) — output goes to `app/generated/prisma/`
- Requires `@prisma/adapter-better-sqlite3` driver adapter; `PrismaClient` **must** receive `{ adapter }` in constructor
- Generated files have `@ts-nocheck` — **never import types from the generated client**
- All Prisma types are manually declared in `types/index.ts`
- `lib/prisma.ts` strips the `file:` prefix from `DATABASE_URL` before passing to the adapter

### Next.js 16 dynamic routes
- `params` in page/route components is a `Promise` — always `await params` before destructuring
- Pattern: `const { id } = await params;`

### Next.js 16 async layout
- `app/layout.tsx` is `async` — it fetches `ui_language` from the DB to initialize the translation provider
- Do not make it synchronous

### Tailwind v4
- No `tailwind.config.js` — configuration is inline in `app/globals.css` via `@theme inline`
- Class utilities are the same but config syntax differs from v3

### Radix UI Select (via shadcn)
- `<SelectItem value="">` throws — use sentinel `value="__none"` for empty/no-selection
- Convert `"__none"` back to `null` in `onValueChange`

### TipTap + Next.js SSR
- Always pass `immediatelyRender: false` to `useEditor` to prevent hydration mismatch
- Use `key={someInteger}` increment pattern to remount the editor when content changes programmatically
- `TemplateEditor` is reusable: accepts `placeholder`, `minHeightClassName`, and `className` props — used both for email templates and the custom signature editor in Settings
- `TemplateEditor` configures `StarterKit` with `link: false` to avoid conflict with the explicit `Link` extension; do not re-enable it

### Date serialization
- Prisma returns `Date` objects; JSON serialization converts them to ISO strings
- Server components pass data to clients via `JSON.parse(JSON.stringify(record))`
- Client components that receive serialized Prisma records use local type aliases (e.g. `ProspectData`) with `string` for date fields instead of `Date`

### Lucide React 1.17.0
- No `Facebook`, `Instagram`, `Linkedin` icons — they were removed from this version
- Social link fields use text labels instead of icons

### Auth system
- Sessions use JWT signed with `AUTH_SECRET` env var (must be set, any long random string)
- Tokens stored in `crm_session` httpOnly cookie, 30-day expiry
- `middleware.ts` validates session on every request; unauthenticated → redirect to `/login`
- Public paths (no auth required): `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/forgot-password`
- Password stored as bcrypt hash in `Settings.password_hash`
- **First launch:** `password_hash` is empty → the first successful login sets the password from whatever was typed
- **Forgot password:** `POST /api/auth/forgot-password` generates a random 12-char password, stores its hash, emails it to `gmail_user`
- `lib/auth.ts` exports `createSession()`, `verifySession()`, `getSession()`, `getSessionCookieOptions()`
- Password can be changed in Settings → Security section (PATCH `/api/auth/password`)

### Appointment conflict detection
- `lib/appointments.ts` exports `findConflict()` — checks for overlapping scheduled appointments globally across all prospects
- `findCallbackWarnings()` — non-blocking; finds other prospects with a `callback_at` in the same time window
- The create/update route returns 409 if a hard conflict exists; warnings are soft and returned alongside `{ appointment, warnings }`

### Language system (two independent axes)
- **`ui_language`** (`Settings.ui_language`, default `"en"`) — language of the CRM interface (labels, buttons, nav, etc.)
- **`content_language`** (`Settings.content_language`, default `"fr"`) — language of email templates and the signature
- These two axes are **completely independent**: you can have an English UI with French templates, or vice versa
- `lib/i18n.ts` exports `translations` (`{ en, fr }`) and the `T` type — values are strings or arrow functions for dynamic content
- `components/providers/UiLanguageProvider.tsx` exports `UiLanguageProvider` + `useT()` hook
- `app/layout.tsx` reads `ui_language` from the DB and passes it as a prop to `AppShell`
- `AppShell` wraps the entire app in `<UiLanguageProvider language={uiLanguage}>`
- Every client component that displays UI text imports `useT()` and uses `const t = useT()`
- **Never hardcode UI strings** in client components — always use `t.key`
- DB values (status values, country codes, document categories, appointment types) are stored in English and translated at render time via `t.status(v)`, `t.country(v)`, `t.doc_category(v)`, `t.appt_type(v)`, `t.appt_status(v)`
- Changing `ui_language` in Settings triggers `router.refresh()` to re-fetch the server-rendered layout with the new language
- `ProspectStatusBadge` is `"use client"` (uses `useT()`)
- Sub-components (inner functions within a client component) that use translated strings must also call `useT()` directly — do not try to pass `t` from a module-level helper function (hooks can only be called inside React functions)

## Architecture

```
app/
  layout.tsx              # Root (async server): reads ui_language from DB → passes to AppShell
  page.tsx                # Redirect → /prospects
  login/page.tsx          # Renders <LoginForm /> (bypasses AppShell chrome, still inside UiLanguageProvider)
  prospects/
    page.tsx              # Renders <ProspectsView /> (client, manages all list state)
    [id]/page.tsx         # Server: fetch → <ProspectDetail /> (client)
  callbacks/page.tsx      # Server: fetch + sort → <CallbacksView /> (client)
  appointments/page.tsx   # Server: fetch all appointments → <AppointmentsView /> (client)
  calendar/page.tsx       # Renders <CalendarView /> (client, fetches /api/calendar)
  clients/page.tsx        # Renders <ProspectsView apiUrl="/api/clients" />
  lists/
    page.tsx              # Server: fetch lists + counts → <ListsView /> (client)
    new/page.tsx          # Renders <CsvImporter /> (redirects to /lists after import)
  import/page.tsx         # Legacy route — kept for backward compat, same as /lists/new
  templates/
    page.tsx              # Server: fetch Settings (content_language) → <TemplatesList />
    [id]/page.tsx         # id="new" → fetch Settings (content_language) → <TemplateEditorView />
  settings/page.tsx       # Server: upsert Settings → <SettingsForm />
  api/
    auth/
      login/route.ts          # POST → verify email+password, set session cookie
      logout/route.ts         # POST → delete session cookie
      forgot-password/route.ts # POST → generate & email new password
      password/route.ts       # PATCH → change password (requires current password + session)
    prospects/route.ts            # GET (list+filters+visibility+pagination), PATCH (bulk status), DELETE (bulk)
    prospects/[id]/route.ts       # GET, PATCH, DELETE single
    prospects/[id]/appointments/route.ts  # POST → create appointment for prospect
    prospects/[id]/documents/route.ts     # POST → upload document for prospect
    prospects/export/route.ts     # GET → CSV download (by ids or by filter params)
    appointments/route.ts         # GET → all appointments with prospect data
    appointments/[appointmentId]/route.ts # PATCH (status/fields), DELETE
    calendar/route.ts             # GET → merged events: scheduled appointments + callbacks
    clients/route.ts              # GET → prospects filtered to high-value statuses only
    documents/[docId]/route.ts    # DELETE
    documents/[docId]/download/route.ts   # GET → file download (attachment)
    documents/[docId]/view/route.ts       # GET → file inline view (for PDF/image preview)
    lists/route.ts                # GET all lists, POST create
    lists/[id]/route.ts           # PATCH (toggle is_visible), DELETE (cascade-delete prospects)
    import/route.ts               # POST → bulk insert, gm_link dedup, upsert List record
    email/route.ts                # POST → Nodemailer send, auto-status update
    templates/route.ts            # GET (supports ?language= filter), POST
    templates/[id]/route.ts       # GET, PATCH, DELETE
    settings/route.ts             # GET (upsert default), PATCH
    settings/test/route.ts        # POST → test email to self

components/
  layout/
    AppShell.tsx          # Client: root shell — accepts uiLanguage prop, wraps app in UiLanguageProvider, skips chrome on /login
    Sidebar.tsx           # Nav sidebar (client, collapsible via localStorage + useSyncExternalStore). Labels via useT(). Appointments uses CalendarClock icon (distinct from Calendar's CalendarRange)
    BottomNav.tsx         # Mobile-only fixed bottom nav (7 items: Prospects, Callbacks, Appts, Cal, Clients, Lists, Templates). Labels via useT()
    TopBar.tsx            # Mobile-only sticky top bar (logo + Settings link) — rendered inside AppShell
    PageHeader.tsx        # Shared page title/description/actions header
  auth/
    LoginForm.tsx         # Client: email+password form, forgot-password flow. All strings via useT()
  appointments/
    AppointmentsView.tsx  # Client: all appointments grouped Today/This Week/Upcoming/Past; uses shared FilterPill + TableSectionHeader, sort toggle. All strings via useT()
  calendar/
    CalendarView.tsx      # Client: custom Google-Calendar-style month/week/day views; fetches /api/calendar. Day-cell click → day view; event click → modal. Mobile = month + day only. Uses lib/calendarUtils.ts
  providers/
    UiLanguageProvider.tsx # UiLanguageProvider component + useT() hook — import useT() in any client component that displays text
  prospects/
    ProspectsView.tsx     # Client: manages all list state, filters, pagination, bulk ops; apiUrl prop (default /api/prospects); pageTitle now optional (defaults to t.page_prospects or t.page_clients)
    ProspectDetail.tsx    # Client: full edit form. Desktop = 2 cols, right column is sticky w/ own scroll (Status, Callback, Documents, Appointments, Details). Mobile = quick-actions bar (Email/Call/Maps/Site) + accordion
    ProspectFilters.tsx   # Client: filter bar + removable active-filter pills. All labels via useT(); country options translated via t.country()
    ProspectTable.tsx     # Client: table with bulk action bar and pagination. Column headers + bulk labels via useT()
    ProspectRow.tsx       # Client: single table row with inline status change. Dropdown labels via useT()
    ProspectCard.tsx      # Client: mobile card for a single prospect row
    ProspectStatusBadge.tsx # "use client" — colored status pill using t.status(value) for the label
    OpeningHours.tsx      # Parses raw pipe-separated hours string into a day grid
    SendEmailModal.tsx    # Modal: pick template (filtered to content_language, grouped by category), preview, send; supports attachment. All strings via useT()
    AppointmentForm.tsx   # Client: create/edit form with conflict detection + callback warnings. All labels via useT()
    AppointmentsSection.tsx # Client: per-prospect appointments with upcoming/past grouping. Type/status labels via t.appt_type() / t.appt_status()
    DocumentsSection.tsx  # Client: per-prospect document list with upload/download/delete/preview. Category labels via t.doc_category()
  callbacks/
    CallbacksView.tsx     # Client: overdue/scheduled/unscheduled groups; uses shared FilterPill + TableSectionHeader. All strings via useT()
  lists/
    ListsView.tsx         # Client: table of lists with visibility toggle + delete. All strings via useT()
  templates/
    TemplatesList.tsx     # Client: FR/EN toggle; grouped by category (language-aware). Whole card is clickable (navigates to editor); edit + delete icons reveal on hover
    TemplateEditorView.tsx # Client: TipTap editor + save, with language selector + category select
  import/
    CsvImporter.tsx       # Client: drag-drop CSV, preview, import; redirects to /lists on success
  settings/
    SettingsForm.tsx      # Client: 5 accordion sections — SMTP, Sender profile, Email signature, Language (content_language + ui_language), Security
  ui/                     # shadcn/ui primitives + TimePicker (15-min custom) + FilterPill + TableSectionHeader (shared grouped-list UI driven by lib/tones.ts)

lib/
  prisma.ts           # Singleton with BetterSqlite3 adapter
  auth.ts             # JWT session utils (createSession, verifySession, getSession, getSessionCookieOptions)
  gmail.ts            # sendEmail() via Nodemailer
  csv.ts              # parseCsv() + normalizeCsvRow() (papaparse)
  constants.ts        # STATUS_OPTIONS, STATUS_COLORS, COUNTRY_OPTIONS, CSV_COLUMNS
                      # + APPOINTMENT_DURATIONS, APPOINTMENT_TYPES, APPOINTMENT_STATUS, TIME_PICKER_MINUTES
                      # + Language type ("en" | "fr"), LANGUAGE_OPTIONS, TEMPLATE_CATEGORIES,
                      #   UNCATEGORIZED_LABEL, getTemplateCategories(language)
  i18n.ts             # Translation dictionary: translations.en / translations.fr (~250 keys).
                      # T type exported for useT() return type. Values are strings or arrow functions
                      # for dynamic content (e.g. t.x_selected(n), t.delete_prospect_confirm(name))
  templates.ts        # replaceVariables(), buildSignature(), renderStandardSignature()
                      # + SIGNATURE_FIELD_OPTIONS, parseSignatureVisibleFields(),
                      #   serializeSignatureVisibleFields(), SignatureVisibleField type
                      # renderStandardSignature() and buildSignature() accept { language } option
                      # to resolve the correct professional title (FR vs EN)
  appointments.ts     # findConflict(), findCallbackWarnings() — used by appointment create/update routes
  calendarUtils.ts    # Date-grid + event-positioning helpers for the custom CalendarView (getMonthGrid, getWeekDays, getEventPosition, formatters)
  tones.ts            # Shared semantic tone palette (Tone type + TONE_PILL_ACTIVE/TONE_DOT/TONE_SECTION) for FilterPill + TableSectionHeader
  prospectFilters.ts  # buildProspectWhere() — shared between list + export routes
  utils.ts            # cn() from shadcn

middleware.ts         # JWT session guard — unauthenticated requests → redirect to /login

types/index.ts        # Prospect, Appointment, AppointmentWithProspect, Document,
                      # CalendarEvent, CalendarEventType, CalendarEventMeta,
                      # EmailTemplate (has `language: string`), List,
                      # Settings (has ui_language, content_language, professional_title_en)
                      # — manually declared, never import from app/generated/prisma

uploads/              # Uploaded document files (gitignored)

prisma/
  seeds/
    templates.ts      # French template seed (21 templates) — npm run seed:templates
    templates-en.ts   # English template seed (21 templates) — npm run seed:templates:en (idempotent)
```

## Status values

`new` → `contacted` → `callback` → `not_interested`  
`contacted` → `no_answer`  
`contacted` → `proposal_sent` → `client` → `archived`

**High-value statuses** — `proposal_sent`, `client`, `archived` — are always visible on `/prospects` regardless of list visibility.

## MCP servers

Configured in `.mcp.json` at the project root. Enabled via `enableAllProjectMcpServers: true` in `.claude/settings.local.json`.

| Server | Package | Use for |
|---|---|---|
| `playwright` | `@playwright/mcp` | Browser automation — navigate pages, click, fill forms, take screenshots, verify UI changes end-to-end |
| `puppeteer` | `@modelcontextprotocol/server-puppeteer` | Chrome DevTools access — inspect DOM, run JS in-page, capture network traffic, audit rendered HTML |
| `context7` | `@upstash/context7-mcp` | Up-to-date library documentation — fetch current docs for frameworks, libraries, APIs (React, Next.js, Prisma, Tailwind, etc.) |

All servers run via `npx` (no local install required). Use Playwright for high-level UI testing flows; use Puppeteer for low-level Chrome DevTools Protocol access; use Context7 whenever you need the latest documentation for a library or framework.

## Development

```bash
npm run dev                            # starts on http://localhost:3000
npx prisma migrate dev --name <name>   # schema changes
npx prisma studio                      # DB browser
npm run seed:templates                 # seed French templates (idempotent)
npm run seed:templates:en              # seed English templates (idempotent)
```

Requires `.env` with `DATABASE_URL` and `AUTH_SECRET`. Settings (Gmail credentials) are stored in the SQLite `Settings` table (id=1 singleton). Go to `/settings` before sending emails.

## Key patterns

**`router.refresh()`** — used in client components after mutations that need the server component to re-fetch (Callbacks page, ProspectDetail after delete, and after saving `ui_language` in Settings to reload the layout with the new language).

**Optimistic updates** — status changes in the prospects list update local state before the API call resolves, then revert on error via `fetchData()`.

**AbortController** — `ProspectsView` cancels in-flight fetch requests when filters change before the previous request completes.

**Bulk filter-building** — `lib/prospectFilters.ts` exports `buildProspectWhere()`, shared by `api/prospects/route.ts` and `api/prospects/export/route.ts`.

**Signature visible fields** — `Settings.signature_visible_fields` is a comma-separated string of up to 10 field keys (`name,title,phone,email,website,linkedin,instagram,facebook,whatsapp,github`). Use `parseSignatureVisibleFields()` / `serializeSignatureVisibleFields()` from `lib/templates.ts` to convert between string and `SignatureVisibleField[]`. `renderStandardSignature()` (also in `lib/templates.ts`) accepts a `SenderVars`-shaped object and renders the HTML signature table, respecting the visible fields and returning `""` if nothing would show.

**Language — UI strings** — all visible UI text in client components uses `const t = useT()` and `t.key`. Never hardcode strings. For strings with variables (e.g. `"Delete ${name}?"`), `t.key` is a function: `t.delete_prospect_confirm(name)`. Inner sub-components (nested functions inside a client file) that need translations must also call `useT()` themselves — hook call cannot be delegated to a module-level helper.

**Language — content language** — `Settings.content_language` controls which email template library is shown and which signature title is used. `api/templates/route.ts` supports `?language=` for filtering. `SendEmailModal` reads `settings.content_language` and only shows templates of that language. `renderStandardSignature()` accepts `{ language }` and resolves `professional_title` vs `professional_title_en` accordingly.

**Language — DB values are always English** — status values (`new`, `contacted`, etc.), country codes (`CH`, `FR`), document categories (`form`, `quote`, `invoice`, `other`), and appointment types/statuses (`call`, `visio`, `scheduled`, `completed`, `cancelled`) are stored as English slugs. Translated labels are resolved at render time: `t.status(v)`, `t.country(v)`, `t.doc_category(v)`, `t.appt_type(v)`, `t.appt_status(v)`.

**List visibility filtering** — `api/prospects/route.ts` fetches all visible lists first, then queries prospects with `OR: [{ list_name: { in: visibleListNames } }, { status: { in: highValueStatuses } }]`. This means hiding a list removes its prospects from the main view, but high-value prospects (proposal_sent, client, archived) are always shown regardless of list visibility.

**ProspectsView reuse** — `ProspectsView` accepts optional `apiUrl` (default `/api/prospects`) and `pageTitle` (now optional — defaults to `t.page_prospects` or `t.page_clients` based on `apiUrl`). The `/clients` page passes only `apiUrl="/api/clients"` to reuse the same component with a different data source.

**Import → List** — after a successful CSV import, `api/import/route.ts` calls `prisma.list.upsert` to create (or no-op update) the List record for the imported batch. `CsvImporter` then redirects to `/lists` after 2 s.

**List delete cascade** — `DELETE /api/lists/[id]` deletes prospects from that list whose status is NOT in high-value statuses, then deletes the List record. High-value prospects keep their `list_name` but stay in the database.

**Sidebar collapse** — `Sidebar.tsx` uses `useSyncExternalStore` to read `localStorage("sidebar-collapsed")`. Toggling dispatches a `StorageEvent` so the same-tab subscription fires (storage events are cross-tab only by default).

**Appointment conflict detection** — `POST /api/prospects/[id]/appointments` and `PATCH /api/appointments/[appointmentId]` call `findConflict()` before saving. A hard overlap returns 409 `{ conflictWith }`. Callback overlaps are soft warnings returned in `{ appointment, warnings }` alongside a 200.

**Document uploads** — files stored in `uploads/<prospectId>/` at the project root. `POST /api/prospects/[id]/documents` accepts `multipart/form-data` with `file` + `category`. Overwriting a filename replaces the existing DB record and file.

## Design system

Keep the look consistent and premium-but-sober (Calendar page is the reference; never restyle it):

- **Page shell** — every page uses `p-6 md:p-8` padding. Wide list pages (Prospects, Clients, Callbacks, Appointments) go full-width; narrow pages (Settings, Templates, Lists, Import, template editor) center their content in a `max-w-*` wrapper.
- **Cards / tables** — canonical container is `rounded-xl border border-zinc-200 bg-white shadow-sm`; tables add `overflow-hidden`. Table headers: `bg-zinc-50/80` + `px-4 py-2.5` + `text-xs font-semibold uppercase tracking-wide text-zinc-500`. Body cells: `px-4 py-3`.
- **Status colours** — `STATUS_COLORS` in `lib/constants.ts` is a sober palette: soft `bg-*-50` tint + muted hue + `ring-1 ring-inset` (no saturated `bg-*-100`). Hues are `rose`/`violet`/`emerald`/`sky`/`amber`/`stone`/`zinc` — avoid raw `red`/`green`/`blue`/`purple`.
- **Grouped-list UI** — use the shared `FilterPill` and `TableSectionHeader` (`components/ui/`) driven by the `Tone` palette in `lib/tones.ts`. Don't re-implement pills/section headers per view.
- **Empty states** — `flex flex-col items-center justify-center py-24 text-zinc-400 text-sm gap-3` with a `w-8 h-8 text-zinc-200` icon, then a `<p>`, then an optional action button.
