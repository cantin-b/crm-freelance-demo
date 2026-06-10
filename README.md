# Freelance CRM

Personal prospecting CRM for cold outreach to small businesses (tradespeople: painters, plumbers, electricians, landscapers, etc.) in French-speaking countries — CH, FR, BE, LU.

Built with Next.js App Router, SQLite via Prisma, and shadcn/ui. Password-protected (single user).

## Features

- **Login** — password-protected with a JWT session cookie. First login sets the password; forgot-password emails a new one.
- **Prospects list** — filterable by country, category, status, email/website presence, and import batch. Only prospects from visible lists are shown; high-value prospects (proposal_sent, client, archived) are always visible. Bulk status change, bulk export, bulk delete.
- **Prospect detail** — edit all fields inline, manage callbacks (scheduled or freeform note), rich notes, attached documents, and appointments.
- **Appointments** — schedule phone calls and video calls for prospects with conflict detection. Global list view at `/appointments` grouped by Today/This Week/Upcoming/Past.
- **Calendar** — custom Google-Calendar-style month/week/day views at `/calendar` combining all scheduled appointments and pending callbacks. Clicking a day cell opens the day view; clicking an event opens its modal. Mobile shows month + day only.
- **Documents** — upload PDFs, images, Word, and Excel files per prospect. Preview (PDF/images) and download inline.
- **Lists** — manage import batches: toggle visibility to show/hide a batch's prospects, delete a list with a cascade that preserves high-value prospects.
- **CSV import** — drag & drop at `/lists/new`, auto-detects 17 columns by header name, duplicate detection by Google Maps URL. Creates a List record automatically on import.
- **Clients** — dedicated view of all prospects with status `proposal_sent`, `client`, or `archived`, regardless of list visibility.
- **Email templates** — TipTap rich text editor, organized by category, with FR and EN template libraries. Variables: `{{name}}`, `{{owner}}`, `{{city}}`, `{{website}}`, and sender variables.
- **Send email** — pick a template (grouped by category, filtered to active content language), variables auto-replaced with prospect data, send via Gmail SMTP. Supports file attachments up to 10 MB.
- **Callbacks** — filtered view of prospects awaiting follow-up, sorted by scheduled date.
- **Export** — download current filtered view or selected rows as CSV.
- **Settings** — configure Gmail credentials, sender profile, email signature, language preferences, and password.
- **Multi-language** — two independent language axes:
  - *UI language* (Settings → Language → Interface language): switches the CRM interface between English and French. Default: English.
  - *Content language* (Settings → Language → Content language): controls which email template library (FR or EN) is shown and the language of the email signature. Default: French.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file at the project root:

```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="<any long random string>"
```

`AUTH_SECRET` is used to sign the session JWT. Generate one with `openssl rand -base64 32`.

### 3. Run migrations

```bash
npx prisma migrate deploy
```

This creates `prisma/dev.db`.

### 4. Seed email templates (optional)

The repository ships with a French template seed (run automatically on first migration) and a separate English seed:

```bash
npm run seed:templates      # French templates (21)
npm run seed:templates:en   # English templates (21) — idempotent, safe to re-run
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`. The first login attempt sets the password.

## Gmail setup

The app sends email via Gmail SMTP using an **App Password** (not your main account password).

1. Enable 2-factor authentication on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate a password for "Mail"
4. Go to `/settings` in the app and enter your Gmail address + App Password

The Gmail address configured in Settings is also used as the login email.

## CSV format

The importer auto-detects columns by exact header name. Supported columns:

```
name, category, address, postal_code, city, country, phone, email,
website, gm_link, rating, reviews_count, opening_hours, owner,
facebook_url, instagram_url, linkedin_url
```

- `name` is the only required column
- `gm_link` is used for duplicate detection — rows with a `gm_link` already in the database are skipped
- `owner` supports multiple owners separated by `;` (e.g. `Jean Dupont;Marie Martin`)
- `country` should be ISO 2-letter codes: `CH`, `FR`, `BE`, `LU`

## Navigation

Sidebar order: **Prospects** / **Callbacks** / **Appointments** / **Calendar** / **Clients** / **Lists** / **Templates** / **Settings**

Mobile bottom nav: **Prospects** / **Callbacks** / **Appts** / **Cal** / **Clients** / **Lists** / **Templates**

## Status pipeline

```
new → contacted → callback → not_interested
                           → no_answer
                           → proposal_sent → client → archived
```

Statuses `proposal_sent`, `client`, and `archived` are considered **high-value** — prospects with these statuses are always visible on the Prospects page and in the Clients view, even if their source list is hidden or deleted.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via Prisma 7 + `better-sqlite3` |
| UI | shadcn/ui + Tailwind CSS v4 |
| Rich text | TipTap 2 |
| Email | Nodemailer (Gmail SMTP) |
| Auth | jose (JWT) + bcryptjs |
| Calendar | Custom Google-Calendar-style views (no external calendar library) |
| Icons | Lucide React |
| i18n | Custom context-based system (`lib/i18n.ts` + `useT()` hook) — no external library |
