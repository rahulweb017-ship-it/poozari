# poozari.com

Vedic puja booking platform — web, REST API, and (Phase 3) mobile apps.

Devotees browse and book pujas (at home / teerth / temple), pay online, get a
verified pandit auto-assigned by area, and receive a recorded pooja video + prasad.

## Roles
- **Super Admin** — manages the whole platform, auto/manual pandit assignment.
- **Pandit (Poojari)** — sees assigned bookings, updates status, uploads pooja video.
- **Customer** — books pujas, pays, tracks bookings, watches pooja video.

## Monorepo layout
```
apps/
  api/      NestJS + Prisma (PostgreSQL) REST API
  web/      Next.js (App Router) — public site + all 3 panels
  mobile/   Expo / React Native (Phase 3)
packages/
  shared/   Shared TypeScript types, Zod validation, API client
```

## Tech stack
- Web: Next.js (App Router), TypeScript, Tailwind CSS
- API: NestJS, Prisma, PostgreSQL, JWT auth + RBAC
- Payments: Razorpay (INR)
- Mobile: React Native (Expo) — Android + iOS
- Tooling: pnpm workspaces + Turborepo

## Getting started
```bash
pnpm install

# 1. Configure env. Copy the examples and set your real values:
#    apps/api/.env      (DATABASE_URL, JWT_SECRET, Razorpay keys)
#    apps/web/.env.local
#    In particular set DATABASE_URL to valid Postgres credentials, e.g.
#    postgresql://HOST:PORT/poozari?schema=public  (include credentials if your server requires auth)

# 2. Create the schema and generate the client
pnpm --filter @poozari/api prisma:generate
pnpm --filter @poozari/api exec prisma migrate deploy   # applies prisma/migrations
# (or `prisma migrate dev` during development)

# 3. Seed sample cities, temples, pujas, pandits and the super admin
pnpm --filter @poozari/api seed

# 4. Run API (:4000) and web (:3000)
pnpm dev
```

### Default logins after seeding
- Super Admin: `admin@poozari.com` / `admin12345` → `/admin/login`
- Pandit: `pandit.varanasi@poozari.com` / `pandit12345` → `/pandit/login`
- Customer: any mobile number via OTP (dev mode shows the code on screen) → `/login`

### Dev payment mode
When `RAZORPAY_KEY_ID` is not a real key, payments run in mock mode: the
checkout is auto-confirmed so you can exercise the full booking → assignment →
video flow without live Razorpay keys. The same mock mode applies to Live
Darshan join-fee payments.

## Live Darshan
Customers can watch poojas streamed live and pay a per-session **join fee** to
unlock the stream.

- Public listing: `/live-darshan` (Live now / Upcoming / Past).
- Viewer + paywall: `/live-darshan/[id]` — anonymous users see a "login to
  join" prompt; logged-in customers pay the join fee (Razorpay, or dev mock) to
  reveal the player.
- Admin management: `/admin/live` — create sessions (title, puja, pandit, join
  fee, scheduled time, playback URL), then **Go live** / **End**.
- Pandit: `/pandit/live` — a pandit sees their own sessions and can go live /
  end them.

The `playbackUrl` is only returned by the API once the viewer has paid access
(`hasAccess: true`), so the stream URL is never exposed to non-paying users.
Playback supports HLS (`.m3u8`, via hls.js) and YouTube/Vimeo embeds. A real
streaming provider (Mux / Cloudflare Stream) can be plugged in later — today
the admin/pandit pastes a playback URL.

### Live captions
While a session is live, the pandit (or admin) can push **captions** — the
current mantra/shloka — from `/pandit/live` or `/admin/live`. Each caption
carries translations in Sanskrit (सं), Hindi (हिं) and English (EN). Viewers
watching the stream see the caption overlaid on the video (polled every 5s) and
a **CC button** in the player corner cycles the caption language; the choice is
remembered in `localStorage`. One-tap preset mantras are provided so the pandit
need not type translations mid-ceremony. Captions are pushed manually (suited
to devotional content); automatic speech-to-text can arrive with the real
streaming provider.

- View current caption: `GET /api/live/:id/caption` (public).
- Push a caption: `POST /api/pandit/live/:id/captions` (owning pandit) or
  `POST /api/admin/live/:id/captions` (admin), body `{ "translations": { "sa": "…", "hi": "…", "en": "…" } }`.

## Pooja video upload
Pandits attach the recorded pooja video to a booking from `/pandit/bookings`:
either paste a video URL, or **Record in app** (uses the device camera via
`MediaRecorder`) and upload the file.

- Upload endpoint: `POST /api/pandit/bookings/:id/video-file` (multipart,
  ≤ 500 MB).
- Files are stored on local disk under `apps/api/uploads/` (gitignored) and
  served at `/uploads/...`. The storage layer is behind an `ObjectStorage`
  interface (`apps/api/src/storage/`), so swapping in S3/R2 later is a
  drop-in change. Override the directory with the `UPLOAD_DIR` env var.

## Local database (this machine)
An isolated PostgreSQL instance was created for development using the installed
PG17 binaries, so it does not touch your existing service on port 5432.
- Data dir: `.pgdata/` (gitignored) · Port: **5433** · Superuser: `admin_poozari`
- Database: `poozari` · connection string already set in `apps/api/.env`

```powershell
$bin = "C:\Program Files\PostgreSQL\17\bin"
# start
& "$bin\pg_ctl.exe" -D "C:\projects\poozari\.pgdata" -o "-p 5433" -l "C:\projects\poozari\.pgdata\server.log" start
# stop
& "$bin\pg_ctl.exe" -D "C:\projects\poozari\.pgdata" stop
```

## Validation status
- `pnpm --filter @poozari/shared typecheck` ✅
- `pnpm --filter @poozari/api typecheck` / `build` ✅
- `pnpm --filter @poozari/web typecheck` / `build` ✅ (23 routes)
- End-to-end smoke test ✅ — booking → assignment → video, Live Darshan
  create → go-live → paywall → pay → unlock → end, and in-app video upload all
  verified against the local Postgres instance.

## Build phases
- **Phase 0** Foundation: monorepo, schema, auth/RBAC. ✅ in progress
- **Phase 1** MVP: public site + customer booking + Super Admin assignment.
- **Phase 2** Video + full pandit/customer panels.
- **Phase 3** Mobile apps (Expo).
- **Phase 4** Polish, i18n, launch.
