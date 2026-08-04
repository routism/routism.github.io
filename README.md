# Routism

**Your routine. On autopilot.**

A Progressive Web App for recurring tasks and routines — set a task once and
Routism keeps it running: reminders, streaks, and insights included.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the blanks (see below)
npm run migrate         # creates the SQLite database and tables
npm run dev              # starts the API with nodemon on PORT (default 3000)
npm start                 # production start
```

Then open http://localhost:3000 in a browser.

## Environment variables

See `.env.example` for the full list. A few need values only you can provide:

- `JWT_SECRET` — any long random string (used to sign auth tokens). The server
  will refuse to start without this set.
- `EMAIL_USER` / `EMAIL_PASS` — a Gmail address and an
  [App Password](https://myaccount.google.com/apppasswords), for future
  password-reset/notification email sending (not wired to an email transport
  yet — see Known Limitations below).
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — used for web push notifications.
  A working dev key pair ships pre-filled in `.env` so push notifications
  work immediately. **Regenerate your own before deploying anywhere real**
  (`npx web-push generate-vapid-keys`) — these are shared dev keys, not a
  secret you should keep.

Everything else has a sensible local-dev default.

## Project structure

```
server/
  index.js              Express app entry point
  scheduler.js           Recurring reminder-check loop
  db/                     SQLite connection, schema, migration script
  middleware/             Auth guard, error handling, request validation
  routes/                 HTTP route handlers (thin — delegate to services)
  services/               Business logic (auth, tasks, insights, premium, ...)
  utils/                   JWT, password hashing, recurrence engine, logger

public/
  index.html               App shell
  manifest.webmanifest       PWA manifest
  service-worker.js          Offline caching + push notification handling
  css/styles.css              Theme system (Classic/Dark/Ocean/Forest)
  js/
    app.js                     Bootstraps the app
    router.js                   Hash-based client-side router
    api.js                      Fetch wrapper with auth handling
    state.js                    Small pub/sub store
    screens/                    One module per screen
    utils/                      Shared frontend helpers
```

## Scripts

- `npm run migrate` — create/update the SQLite schema
- `npm run dev` — start the API with auto-reload (nodemon)
- `npm start` — start the API normally

## Core features

- Email/password auth with verification and password-reset flows
- Recurring tasks: Daily, Weekly, Monthly, Yearly, Custom — with pause,
  resume, edit, delete, complete, and skip
- Every occurrence is automatically tracked as completed, skipped, or
  missed (an occurrence you neither completed nor skipped before its day
  ended) — this happens lazily whenever your tasks are loaded, so it's
  always caught up even after being away for a while
- Weekly/monthly calendar view of upcoming occurrences, color-coded by
  status
- Reminders with 12/24-hour time preference and optional web push
- Insights: completion rate, streaks, weekly score, weekly missed/skipped
  counts, most consistent routine, recently missed routines, monthly
  trend, CSV/PDF export
- Achievements: first completion, 7- and 30-day streaks, milestone counts
  (based on actual completions only — skipped/missed occurrences don't
  count toward these)
- Premium: 5-day trial, up to 3 rewarded-ad extensions (3 days each), no
  banner/interstitial ads, and a Founder Lifetime plan capped at the first
  1,000 purchasers with a live remaining-slots count
- Settings: profile, theme (4 themes), time format, subscription, account
  deletion

## Known limitations (by design, for this MVP)

- Password reset/verification tokens are returned directly in the API
  response rather than emailed — there's no email transport wired in yet.
  Wire `EMAIL_USER`/`EMAIL_PASS` into a mailer of your choice
  (e.g. Nodemailer) before shipping.
- Payment (Google Play Billing / Apple IAP) is stubbed: `POST
  /api/premium/subscribe` records the subscription state directly rather
  than verifying a real receipt. Wire in store server-to-server
  verification before shipping.
- A working VAPID key pair ships in `.env` for dev convenience — replace it
  with your own before deploying anywhere real (see above).
