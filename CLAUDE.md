@AGENTS.md

# CRM Freelance Demo Context

This file intentionally defers to `AGENTS.md`.

The important product fact is that this is a portfolio demo, not the private production CRM. It has no database and no real server persistence. All CRUD-like behavior is simulated in browser-side React state by `components/providers/DemoDataProvider.tsx`, with open-tab synchronization through `BroadcastChannel`.

Use `lib/demoSeedData.ts` for fictional starting data, keep CSV import disabled, keep CSV export working, and never reintroduce Prisma, SQLite, JWT middleware, or Nodemailer unless the user explicitly asks to turn the demo back into a private persisted app.
