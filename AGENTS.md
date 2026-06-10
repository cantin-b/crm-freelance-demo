> **Read the Next.js note first.**
> This project uses Next.js 16 with the App Router. APIs and conventions may differ from older assumptions.
> Read the relevant files in `node_modules/next/dist/docs/` before writing Next.js-specific code.

---

# Project Overview

CRM Freelance Demo is a public portfolio demo of a personal cold-outreach CRM. It is intentionally database-free: there is no Prisma, SQLite, JWT middleware, SMTP delivery, or server-side persistence in the demo version.

The app still behaves like a real CRM. Visitors can log in with demo credentials, edit prospects, change statuses, manage callbacks, create appointments, upload temporary documents, edit email templates, adjust settings, and export CSV files. All of that state lives in browser memory and is synchronized between open tabs with `BroadcastChannel`.

Mutations reset back to the fictional seed dataset when no live tab can provide the modified state, such as after closing the demo and opening it again later. If another tab is still open, a refreshed/new tab can receive the current state through `BroadcastChannel`.

---

# Demo Credentials

```text
Email: userone@mail.com
Password: userone
```

The login page exposes these through the "Demo access available" banner and credentials modal.

---

# Tech Stack

| Layer | Library / Version | Notes |
|---|---|---|
| Framework | Next.js 16 App Router | No Pages Router |
| Demo datastore | React state + BroadcastChannel | Implemented in `DemoDataProvider` |
| Styling | Tailwind CSS v4 | Config lives in `app/globals.css` via `@theme inline` |
| UI components | shadcn/ui | Components live in `components/ui/` |
| Rich text | TipTap | Email template editor |
| CSV | PapaParse | Parsing helpers in `lib/csv.ts` |
| Icons | Lucide React 1.17.0 | No `Facebook`, `Instagram`, or `Linkedin` icons |
| Calendar | Custom | `components/calendar/CalendarView.tsx` + `lib/calendarUtils.ts` |
| i18n | Custom | `lib/i18n.ts` + `useT()` |

---

# Runtime Architecture

- `components/providers/DemoDataProvider.tsx` owns the demo state.
- It installs a browser-side `fetch` interceptor for same-origin `/api/...` requests.
- UI components keep using normal API URLs, but the provider resolves them from React state.
- The state fields synced across tabs are prospects, appointments, documents, lists, templates, and settings.
- The current logged-in user is stored separately in `localStorage` under `crm_demo_current_user_email`.
- `BroadcastChannel` channel name: `crm-freelance-demo-state`.
- `DEMO_STATE_UPDATED_EVENT` lets page loaders refresh when another mutation occurs.
- `app/api/[...demo]/route.ts` is a fallback only. Do not implement real persistence there.

Do not add server persistence unless the user explicitly changes the product direction.

---

# Project Structure

```text
app/
  layout.tsx                  # Root layout, wraps everything in AppShell
  page.tsx                    # Redirects to /prospects
  login/page.tsx              # Login form with demo credentials helper
  prospects/page.tsx          # Client CRM list view
  prospects/[id]/page.tsx     # Server shell -> ProspectDetailLoader
  callbacks/page.tsx          # Client loader -> CallbacksView
  appointments/page.tsx       # Client loader -> AppointmentsView
  calendar/page.tsx           # CalendarView
  clients/page.tsx            # ProspectsView with clients API source
  lists/page.tsx              # Client loader -> ListsView
  lists/new/page.tsx          # Disabled CSV importer
  import/page.tsx             # Same disabled importer
  templates/page.tsx          # Client loader -> TemplatesList
  templates/[id]/page.tsx     # Client loader -> TemplateEditorView
  settings/page.tsx           # Client loader -> SettingsForm
  api/[...demo]/route.ts      # Static fallback for direct API hits

components/
  providers/
    DemoDataProvider.tsx      # Demo datastore, API simulation, BroadcastChannel sync
    UiLanguageProvider.tsx    # UI translation provider + useT()
  demo/
    DemoPageLoaders.tsx       # Client-side data loaders replacing former DB reads
  auth/
    LoginForm.tsx             # Login + demo credentials banner/modal
  import/
    CsvImporter.tsx           # Import-disabled public demo screen
  prospects/                  # Prospect list/detail/workflow components
  appointments/               # Appointment dashboard
  callbacks/                  # Callback dashboard
  calendar/                   # Custom calendar
  lists/                      # Demo batch visibility/deletion
  templates/                  # Template list and editor
  settings/                   # Demo settings form
  ui/                         # shadcn primitives

lib/
  demoSeedData.ts             # Fictional prospects, templates, settings, credentials
  i18n.ts                     # Translation dictionary and T type
  constants.ts                # Statuses, countries, CSV columns, language options
  csv.ts                      # CSV parsing helpers
  templates.ts                # Template variable/signature rendering helpers
  calendarUtils.ts            # Calendar date and event positioning helpers
  prospectFilters.ts          # Historical filter helper, still used by types/patterns
  utils.ts                    # cn()

types/index.ts                # Manual shared types
```

---

# Data Rules

- The seed data must stay fictional.
- Do not include real scraped prospects, real emails, or real company data.
- If a website is needed in demo data, prefer `https://cantinbartel.dev/`.
- Keep CSV import disabled for the public demo.
- CSV export should continue to work from the current in-memory demo state.
- Uploaded documents must remain temporary and browser-side.
- Email sending is simulated. Do not reintroduce SMTP.
- Password changes are demo-only and live in memory.

---

# Language System

Two language axes are independent:

| Axis | Setting field | Controls |
|---|---|---|
| UI language | `ui_language` | CRM interface text |
| Content language | `content_language` | Email templates and signature language |

Client components that display text must use `useT()` from `components/providers/UiLanguageProvider.tsx`.

Rules:

- Do not hardcode UI strings in client components.
- Add missing keys to both `translations.en` and `translations.fr`.
- DB-like values are English slugs and translated at render time with helpers like `t.status(value)`, `t.country(value)`, `t.doc_category(value)`, `t.appt_type(value)`, and `t.appt_status(value)`.
- Do not call `useT()` from module-level helper functions. Inner sub-components may call it themselves.

---

# Next.js 16 Conventions

- App Router only.
- `params` and `searchParams` props are Promises. Await them before reading values:

```ts
const { id } = await params;
```

- Keep interactive/browser APIs behind `"use client"` boundaries.
- Client component props crossing from server components must be serializable.
- After meaningful frontend changes, verify in the browser.

---

# UI Conventions

- Match the existing CRM style: dense, calm, work-focused, and practical.
- Use lucide icons in buttons when a suitable icon exists.
- Do not add landing pages. The app should open into the usable CRM experience after login.
- Cards should be used for repeated items, modals, and framed tools only.
- Avoid visible instructional text that explains obvious UI mechanics.
- Ensure text fits in buttons, cards, and compact panels on mobile and desktop.

---

# What Not To Do

- Do not reintroduce Prisma, SQLite, migrations, generated clients, or server-side DB reads.
- Do not reintroduce JWT middleware, bcrypt password storage, or server sessions.
- Do not reintroduce Nodemailer or real Gmail SMTP sending.
- Do not make CSV import active in the public demo.
- Do not import from deleted legacy files like `lib/prisma.ts`, `lib/auth.ts`, `lib/gmail.ts`, or `lib/appointments.ts`.
- Do not add `tailwind.config.js`; Tailwind v4 config belongs in `app/globals.css`.
- Do not use `<SelectItem value="">`; use a sentinel like `__none`.
- Do not use Lucide `Facebook`, `Instagram`, or `Linkedin` icons in this version.

---

# Verification

Run before handing off meaningful changes:

```bash
npm run lint
npm run build
```

For UI changes, also run the dev server and inspect the affected routes in the browser.
