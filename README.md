# CRM Freelance Demo

Portfolio demo of a personal CRM for freelance web prospecting. It looks and behaves like a real cold-outreach CRM, but it intentionally has no database, no SMTP server, and no server-side authentication.

All demo data lives in browser-side React state. Mutations are synced between open tabs with `BroadcastChannel`; they reset when no live tab can provide the modified state, such as after closing the demo and opening it again later. This keeps the public demo safe to publish while still allowing visitors to edit prospects, schedule callbacks, add appointments, upload demo documents, edit templates, and export CSV files.

## Demo Access

Use the login helper shown on `/login`, or enter the credentials manually:

```text
Email: userone@mail.com
Password: userone
```

The login form includes a "Demo access available" banner and a credentials modal inspired by the Scooter Rental demo.

## Demo Behavior

- The initial dataset is defined in `lib/demoSeedData.ts`.
- The seed contains 100 fictional prospects across Belgium, France, and Switzerland.
- Some prospects include website links pointing to `https://cantinbartel.dev/`.
- Demo state is created in `components/providers/DemoDataProvider.tsx`.
- Same-origin `/api/...` calls are intercepted in the browser and handled from React state.
- `app/api/[...demo]/route.ts` is only a fallback for direct API hits.
- CSV import is disabled in the public demo.
- CSV export still works and is generated from the current demo state.
- Email sending is simulated and can update prospect status.
- Documents are stored as in-memory data URLs, not on disk.
- Appointments include basic conflict detection and callback warnings.

## Features

- Prospects list with search, filters, pagination, bulk status updates, bulk delete, and CSV export.
- Prospect detail page with editable CRM fields, callback mode, notes, documents, email modal, and appointments.
- Callback dashboard grouped by overdue, scheduled, and unscheduled callbacks.
- Appointment dashboard grouped by Today, This Week, Upcoming, and Past.
- Custom calendar with month, week, and day views.
- Clients view for `proposal_sent`, `client`, and `archived` prospects.
- Lists view to show, hide, or delete the preloaded demo batch.
- TipTap email templates with French and English content libraries.
- Settings page for demo profile, signature, UI language, content language, and demo password change.
- Two independent language axes:
  - UI language controls CRM interface text.
  - Content language controls templates and signature text.

## Setup

No environment variables are required for the demo.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

Production checks:

```bash
npm run lint
npm run build
```

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 App Router |
| Runtime state | React state + BroadcastChannel |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui |
| Rich text | TipTap |
| CSV parsing | PapaParse |
| Icons | Lucide React |
| i18n | Custom dictionary in `lib/i18n.ts` + `useT()` |

## Important Files

- `components/providers/DemoDataProvider.tsx` - demo datastore, fetch interception, tab sync.
- `lib/demoSeedData.ts` - fictional seed data, demo credentials, default settings.
- `components/auth/LoginForm.tsx` - login form and demo credentials UI.
- `components/demo/DemoPageLoaders.tsx` - client loaders that replace former server DB reads.
- `components/import/CsvImporter.tsx` - public import-disabled screen.
- `app/api/[...demo]/route.ts` - static fallback for direct API calls.
- `lib/i18n.ts` - English and French UI copy.
- `types/index.ts` - shared manual app types.

## CSV Columns

The export keeps the original CRM-oriented shape:

```text
name, category, address, postal_code, city, country, phone, email,
website, gm_link, rating, reviews_count, opening_hours, owner,
facebook_url, instagram_url, linkedin_url
```

Import is intentionally disabled because this project is public and should not accept or store real scraped prospect data.
