> **Read the Next.js note first.**
> This project uses Next.js 16 (App Router). APIs and conventions may differ from your training data.
> Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.

---

# Project Overview

A personal, password-protected CRM for cold outreach to tradespeople (painters, electricians, plumbers, etc.) across French-speaking countries (CH, FR, BE, LU). The owner imports prospect lists from CSV files scraped from Google Maps, manages outreach status, schedules callbacks and appointments, and sends templated emails via Gmail SMTP.

There is no multi-tenancy and no public-facing UI. This is a private internal tool protected by a single password stored as a bcrypt hash in the `Settings` table.

---

# Tech Stack

| Layer | Library / Version | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | No Pages Router — everything is in `app/` |
| ORM | Prisma 7.x | Generator is `prisma-client`, not `prisma-client-js` |
| Database | SQLite via `better-sqlite3` | File at `prisma/dev.db` |
| Adapter | `@prisma/adapter-better-sqlite3` | Required — `PrismaClient` must receive `{ adapter }` |
| Styling | Tailwind CSS v4 | Config is inline in `app/globals.css` via `@theme inline` — no `tailwind.config.js` |
| UI components | shadcn/ui (zinc base) | Components live in `components/ui/` |
| Rich text | TipTap 2.x | Used in the email template editor |
| Email | Nodemailer | Gmail App Password SMTP, credentials stored in SQLite `Settings` table |
| Icons | Lucide React 1.17.0 | No `Facebook`, `Instagram`, or `Linkedin` icons in this version |
| Auth | jose + bcryptjs | JWT session cookie (`crm_session`), 30-day expiry, password bcrypt-hashed in `Settings.password_hash` |
| Calendar | Custom (no external library) | Month/week/day views in `components/calendar/CalendarView.tsx`; date helpers in `lib/calendarUtils.ts` |
| i18n | Custom (no external library) | `lib/i18n.ts` translation dictionary + `useT()` hook — see Language system section |

---

# Project Structure

```
app/
  layout.tsx                  # Root layout (async server): reads ui_language from DB → passes to AppShell
  page.tsx                    # Redirects to /prospects
  globals.css                 # Tailwind v4 config + global styles + brand tokens
  generated/prisma/           # Auto-generated Prisma client — never edit manually

  login/page.tsx              # Login page — bypasses AppShell chrome, still inside UiLanguageProvider
  prospects/
    page.tsx                  # Server component → renders <ProspectsView />
    [id]/page.tsx             # Server component: fetches prospect → <ProspectDetail />
  callbacks/page.tsx          # Server: fetches + sorts → <CallbacksView />
  appointments/page.tsx       # Server: fetches all appointments → <AppointmentsView />
  calendar/page.tsx           # Client: renders <CalendarView />
  clients/page.tsx            # Renders <ProspectsView apiUrl="/api/clients" />
  lists/
    page.tsx                  # Server: fetches lists + prospect counts → <ListsView />
    new/page.tsx              # Renders <CsvImporter /> (redirects to /lists after import)
  import/page.tsx             # Legacy route kept for backward compat — same as /lists/new
  templates/
    page.tsx                  # Server: fetches Settings (content_language) → <TemplatesList />
    [id]/page.tsx             # id="new" → fetch Settings (content_language) → <TemplateEditorView />
  settings/page.tsx           # Server: upserts Settings singleton → <SettingsForm />

  api/
    auth/
      login/route.ts               # POST → verify email+password, set session cookie
      logout/route.ts              # POST → delete session cookie
      forgot-password/route.ts     # POST → generate & email a new random password
      password/route.ts            # PATCH → change password (requires current password + valid session)
    prospects/route.ts              # GET list (filters + visibility + pagination), PATCH bulk status, DELETE bulk
    prospects/[id]/route.ts         # GET, PATCH, DELETE single prospect
    prospects/[id]/appointments/route.ts  # POST → create appointment for this prospect
    prospects/[id]/documents/route.ts     # POST → upload document (multipart/form-data)
    prospects/export/route.ts       # GET → CSV download
    appointments/route.ts           # GET → all appointments with prospect data
    appointments/[appointmentId]/route.ts # PATCH (status/fields), DELETE
    calendar/route.ts               # GET → merged events: scheduled appointments + pending callbacks
    clients/route.ts                # GET → prospects with high-value statuses only (proposal_sent, client, archived)
    documents/[docId]/route.ts      # DELETE
    documents/[docId]/download/route.ts   # GET → file download (Content-Disposition: attachment)
    documents/[docId]/view/route.ts       # GET → inline view (for PDF/image preview in browser)
    lists/route.ts                  # GET all lists, POST create
    lists/[id]/route.ts             # PATCH (toggle is_visible), DELETE (cascade-delete + list record)
    import/route.ts                 # POST → bulk insert with gm_link dedup, upserts List record
    email/route.ts                  # POST → send email via Nodemailer, update prospect status
    templates/route.ts              # GET list (supports ?language= filter), POST create
    templates/[id]/route.ts         # GET, PATCH, DELETE single template
    settings/route.ts               # GET (upsert singleton), PATCH
    settings/test/route.ts          # POST → send test email to self

components/
  layout/
    AppShell.tsx              # Client: root shell — accepts uiLanguage prop, wraps app in UiLanguageProvider; skips sidebar/nav on /login
    Sidebar.tsx               # Nav sidebar (client, collapsible via localStorage + useSyncExternalStore, has logout). All labels via useT()
    BottomNav.tsx             # Mobile-only fixed bottom nav (7 items). All labels via useT()
    TopBar.tsx                # Mobile-only sticky top bar with logo + Settings icon link
    PageHeader.tsx            # Shared page title/description/actions header
  auth/
    LoginForm.tsx             # Client: email+password form with forgot-password flow. All strings via useT()
  appointments/
    AppointmentsView.tsx      # Client: all appointments grouped Today/This Week/Upcoming/Past; filter pills, sort toggle. All strings via useT()
  calendar/
    CalendarView.tsx          # Client: custom Google-Calendar-style month/week/day views; fetches /api/calendar on mount
  providers/
    UiLanguageProvider.tsx    # UiLanguageProvider component + useT() hook — import useT() in every client component that displays text
  prospects/
    ProspectsView.tsx         # Client: manages all list state, filters, pagination, bulk ops; apiUrl prop (default /api/prospects); pageTitle now optional
    ProspectDetail.tsx        # Client: full edit form for a single prospect. All strings via useT()
    ProspectFilters.tsx       # Client: filter bar + removable active-filter pills. All labels and country names via useT()
    ProspectTable.tsx         # Client: table with bulk action bar and pagination. Column headers + bulk labels via useT()
    ProspectRow.tsx           # Client: single table row with inline status change. Dropdown labels via useT()
    ProspectCard.tsx          # Client: mobile card variant for a prospect row
    ProspectStatusBadge.tsx   # "use client" — colored status pill; uses t.status(value) for the label
    OpeningHours.tsx          # Parses raw pipe-separated hours string into a day grid
    SendEmailModal.tsx        # Modal: pick template (filtered to content_language, grouped by category), preview, send
    AppointmentForm.tsx       # Client: create/edit appointment form with conflict detection + callback warnings. All labels via useT()
    AppointmentsSection.tsx   # Client: per-prospect appointments. Type and status labels via t.appt_type() / t.appt_status()
    DocumentsSection.tsx      # Client: per-prospect documents — upload, download, inline preview, delete. Category labels via t.doc_category()
  callbacks/
    CallbacksView.tsx         # Client: overdue/scheduled/unscheduled groups with filter pills. All strings via useT()
  lists/
    ListsView.tsx             # Client: table of lists with visibility toggle + delete. All strings via useT()
  templates/
    TemplatesList.tsx         # Client: FR/EN content language toggle; templates grouped by language-aware categories
    TemplateEditorView.tsx    # Client: TipTap editor + save, with language selector + category select
  import/
    CsvImporter.tsx           # Client: drag-drop CSV, preview, import; redirects to /lists on done
  settings/
    SettingsForm.tsx          # Client: 5 accordion sections — SMTP, Sender profile, Email signature, Language (content + UI language), Security
  ui/                         # shadcn/ui primitives + TimePicker (15-min interval, used in AppointmentForm)

lib/
  prisma.ts                   # Prisma singleton with BetterSqlite3 adapter
  auth.ts                     # JWT session utils: createSession(), verifySession(), getSession(), getSessionCookieOptions()
  gmail.ts                    # sendEmail() via Nodemailer
  csv.ts                      # parseCsv() + normalizeCsvRow() (PapaParse)
  constants.ts                # STATUS_OPTIONS, STATUS_COLORS, COUNTRY_OPTIONS, CSV_COLUMNS
                              # + APPOINTMENT_DURATIONS, APPOINTMENT_TYPES, APPOINTMENT_STATUS, TIME_PICKER_MINUTES
                              # + Language type ("en"|"fr"), LANGUAGE_OPTIONS, TEMPLATE_CATEGORIES,
                              #   UNCATEGORIZED_LABEL, getTemplateCategories(language)
  i18n.ts                     # Translation dictionary: translations.en / translations.fr (~250 keys)
                              # T type exported for useT() return type
                              # Values are strings or arrow functions: t.x_selected(n), t.delete_prospect_confirm(name), etc.
  templates.ts                # replaceVariables(), buildSignature(), renderStandardSignature()
                              # + SIGNATURE_FIELD_OPTIONS, parseSignatureVisibleFields(),
                              #   serializeSignatureVisibleFields(), SignatureVisibleField type
                              # renderStandardSignature() and buildSignature() accept { language } option
                              # to resolve professional_title vs professional_title_en
  appointments.ts             # findConflict(), findCallbackWarnings() — used by appointment write routes
  calendarUtils.ts            # Date-grid + event-positioning helpers for the custom CalendarView
  prospectFilters.ts          # buildProspectWhere(): shared by list + export routes
  utils.ts                    # cn() from shadcn

middleware.ts                 # JWT session guard — validates crm_session cookie; redirects to /login if missing/invalid

types/
  index.ts                    # Prospect, Appointment, AppointmentWithProspect, Document,
                              # CalendarEvent, CalendarEventType, CalendarEventMeta,
                              # EmailTemplate (has `language: string`), List,
                              # Settings (has ui_language, content_language, professional_title_en)
                              # — manually declared; never import from app/generated/prisma (has @ts-nocheck)

uploads/                      # Uploaded document files, stored at uploads/<prospectId>/<filename>

prisma/
  schema.prisma               # Source of truth for the DB schema
  dev.db                      # SQLite database file (gitignored)
  migrations/                 # Migration history
  seeds/
    templates.ts              # French template seed (21 templates) — npm run seed:templates
    templates-en.ts           # English template seed (21 templates) — npm run seed:templates:en (idempotent)
```

---

# Database

**Schema:** `prisma/schema.prisma`  
**File:** `prisma/dev.db`

```bash
# Apply a schema change
npx prisma migrate dev --name <descriptive_name>

# Browse data
npx prisma studio

# Regenerate client after schema edit (migration does this automatically)
npx prisma generate

# Seed templates
npm run seed:templates       # French (21 templates)
npm run seed:templates:en    # English (21 templates, idempotent)
```

**Models:**
- `Prospect` — one row per scraped business; status drives the outreach workflow; has `documents` and `appointments` relations
- `Appointment` — scheduled call/visio for a prospect; `status`: `scheduled | completed | cancelled`; `type`: `call | visio`; `duration` in minutes (multiples of 15)
- `Document` — uploaded file attached to a prospect; `category`: `form | quote | invoice | other`; file on disk at `uploads/<prospect_id>/<filename>`
- `EmailTemplate` — reusable email templates with TipTap HTML body; `category` (nullable) for grouping; `language` (`"fr"` or `"en"`) for the content language axis
- `List` — one row per imported batch; `name` is unique and matches `Prospect.list_name`; `is_visible` controls whether prospects from that list appear on `/prospects`
- `Settings` — id=1 singleton; stores Gmail SMTP credentials, sender profile, signature config, `password_hash` (bcrypt), `content_language` (default `"fr"`), `ui_language` (default `"en"`), `professional_title_en`

**Status workflow:**
```
new → contacted → callback → not_interested
               → no_answer
               → proposal_sent → client → archived
```

---

# Auth

The app is password-protected with a single shared password (single-user, no multi-tenancy):
- Session token: JWT signed with `AUTH_SECRET` env var, stored in `crm_session` httpOnly cookie
- `middleware.ts` guards all routes except `/login` and `/api/auth/*`
- Password stored as bcrypt hash in `Settings.password_hash`
- **First launch:** `password_hash` is empty → the first login attempt sets the password from whatever was typed
- **Forgot password:** `POST /api/auth/forgot-password` emails a new random 12-char password to `gmail_user`
- Login also checks that the submitted email matches `settings.gmail_user` (case-insensitive)

**Required env vars:**
```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="<any long random string>"
```

---

# Language System

Two independent language axes — never conflate them:

| Axis | DB column | Default | Controls |
|---|---|---|---|
| UI language | `Settings.ui_language` | `"en"` | All CRM interface text (labels, buttons, nav, confirmations) |
| Content language | `Settings.content_language` | `"fr"` | Email template library shown + signature title language |

**How the UI language works:**
- `app/layout.tsx` (async server component) reads `ui_language` from the DB and passes it as `uiLanguage` prop to `AppShell`
- `AppShell` wraps the entire app (including `/login`) in `<UiLanguageProvider language={uiLanguage}>`
- Every client component that displays text imports `useT()` and calls `const t = useT()`
- `lib/i18n.ts` exports the `translations` object (`{ en, fr }`) and the `T` type — do not add a new i18n library
- **Never hardcode UI strings** in client components — always use `t.key`
- Changing `ui_language` triggers `router.refresh()` to reload the layout server-side with the new language

**DB values are always English slugs** — translated at render time:
- `t.status(value)` — prospect status labels
- `t.country(code)` — country display names
- `t.doc_category(value)` — document category labels
- `t.appt_type(value)` — appointment type labels
- `t.appt_status(value)` — appointment status labels

**Dynamic strings** — use function values in the dictionary: `t.delete_prospect_confirm(name)`, `t.x_selected(n)`, `t.prospects_page(total, page, totalPages)`, etc.

**Sub-component rule** — inner functions within a client file that display translated strings must call `useT()` themselves. A module-level helper function cannot call hooks.

**Content language:**
- `Settings.content_language` controls which template library (`"fr"` or `"en"`) is shown in `TemplatesList`, `TemplateEditorView`, and `SendEmailModal`
- `api/templates/route.ts` supports `?language=` query param for filtering
- `renderStandardSignature()` and `buildSignature()` accept `{ language }` to resolve `professional_title` vs `professional_title_en`
- The French template library uses categories: "Prospection froide", "Relances", "Téléphone / rendez-vous", "Propositions", "Projet client"
- The English template library uses categories: "Cold outreach", "Follow-ups", "Calls / meetings", "Proposals", "Client project"

---

# Conventions

### Server vs Client components
- **Server components** fetch data from Prisma and pass it as props to client components.
- **Client components** own all interactive state. Marked with `"use client"`.
- Dates from Prisma (`Date` objects) are serialized before crossing the boundary:
  `JSON.parse(JSON.stringify(record))` — client components receive `string` for date fields.

### Dynamic route params (Next.js 16)
`params` is a `Promise` — always `await` before destructuring:
```ts
const { id } = await params;
```

### API routes
- Named exports `GET`, `POST`, `PATCH`, `DELETE` from `route.ts` files.
- Return `NextResponse.json(...)` or `NextResponse.json({error}, {status: N})`.
- Shared filter logic lives in `lib/prospectFilters.ts` (`buildProspectWhere()`).

### Prisma client
- Import only from `@/lib/prisma` — never instantiate `PrismaClient` directly.
- Never import types from `app/generated/prisma/` — use `types/index.ts` instead.

### Tailwind v4
- No `tailwind.config.js`. All theme config is in `app/globals.css` under `@theme inline`.
- Brand tokens: `--brand-navy` and `--brand-red` (usable as `bg-brand-navy`, `text-brand-red`, etc.).

### shadcn/ui quirks
- `<SelectItem value="">` throws — use `value="__none"` as a sentinel for empty selection; convert back to `null` in `onValueChange`.

### TipTap
- Always pass `immediatelyRender: false` to `useEditor` to prevent SSR hydration mismatch.
- Use `key={someInteger}` increment to force-remount the editor when content changes programmatically.

### Component patterns
- `cn()` from `lib/utils` for conditional classNames (re-exported from `clsx`/`tailwind-merge`).
- `router.refresh()` is used after mutations in client components to trigger server re-fetch on pages that use server components for data loading (Callbacks, ProspectDetail delete, and after saving `ui_language` in Settings).
- Optimistic updates: status changes in the list update local state immediately, then revert on fetch error.
- `AbortController` in `ProspectsView` cancels in-flight requests when filters change.
- `ProspectsView` accepts optional `apiUrl` (default `/api/prospects`) and `pageTitle` (now optional — defaults to `t.page_prospects` or `t.page_clients` based on `apiUrl`).

### Layout
- `AppShell` (client component) is rendered by `app/layout.tsx`. It detects `/login` via `usePathname()` and skips sidebar/nav on that route.
- On desktop (md+): `Sidebar` is shown. On mobile: `AppShell` renders a sticky top bar + `BottomNav`.
- `Sidebar` is collapsible — state persisted in `localStorage("sidebar-collapsed")`, read via `useSyncExternalStore` to handle SSR + cross-tab sync.

### List visibility
- The `/api/prospects` route fetches all visible lists first, then applies `OR: [{ list_name: { in: visibleListNames } }, { status: { in: highValueStatuses } }]`.
- High-value statuses (`proposal_sent`, `client`, `archived`) are always visible regardless of list visibility.
- Hiding a list removes its prospects from `/prospects` but does not delete them.
- Deleting a list via `DELETE /api/lists/[id]` permanently deletes all non-high-value prospects from that list, then deletes the List record. High-value prospects keep their `list_name` in the DB.
- After import, `api/import/route.ts` calls `prisma.list.upsert` so the List record always exists.

### Appointments
- Created per-prospect via `POST /api/prospects/[id]/appointments`; edited via `PATCH /api/appointments/[id]`.
- `lib/appointments.ts` `findConflict()` checks for time overlaps globally (all prospects). A conflict returns 409 `{ conflictWith }`.
- `findCallbackWarnings()` is non-blocking — returns soft warnings when another prospect's `callback_at` falls in the same window. Returned alongside a 200 as `{ appointment, warnings }`.
- `AppointmentForm` shows a red error banner for conflicts and amber banner for warnings.

---

# Key Files to Read First

Before touching anything, read these in order:

1. **`CLAUDE.md`** — project context, stack quirks, and critical gotchas (canonical reference)
2. **`prisma/schema.prisma`** — the full data model
3. **`types/index.ts`** — all manually declared types
4. **`lib/constants.ts`** — status values, colors, country codes, CSV column names, appointment options, language types
5. **`lib/i18n.ts`** — UI translation dictionary and T type
6. **`lib/prisma.ts`** — how the DB client is constructed
7. **`middleware.ts`** — session guard and public path list
8. **`app/layout.tsx`** + **`components/layout/AppShell.tsx`** — root layout structure and language provider wiring
9. The relevant page and component files for whatever you're changing

---

# What NOT To Do

- **No schema changes without a migration.** Never edit `prisma/dev.db` directly. Always use `npx prisma migrate dev --name <name>` after editing `schema.prisma`.
- **Do not import types from `app/generated/prisma/`.** That directory has `@ts-nocheck` and its types are internal. Use `types/index.ts`.
- **Do not instantiate `PrismaClient` directly.** Always use the singleton from `lib/prisma.ts`.
- **Do not add `tailwind.config.js`.** Tailwind v4 configuration belongs in `app/globals.css`.
- **Do not use social media icons from Lucide React.** `Facebook`, `Instagram`, `Linkedin` do not exist in version 1.17.0.
- **Do not use `<SelectItem value="">`.** It throws at runtime. Use `value="__none"` as a sentinel.
- **Do not remove the `{ adapter }` argument from `PrismaClient`.** It is required; omitting it silently uses a different driver that doesn't work with this setup.
- **Do not bypass the session middleware.** The `AUTH_SECRET` env var must be set. Do not add routes to `PUBLIC_PATHS` in `middleware.ts` unless they genuinely need to be unauthenticated.
- **Do not hardcode UI strings in client components.** Always use `const t = useT()` and `t.key`. Add missing keys to `lib/i18n.ts` for both `en` and `fr`.
- **Do not call `useT()` from a module-level helper function.** Hooks can only be called inside React components or other hooks. Inner sub-components within a file must call `useT()` themselves.
- **Do not conflate ui_language and content_language.** They are independent: `ui_language` controls the CRM interface; `content_language` controls email templates and signature.
