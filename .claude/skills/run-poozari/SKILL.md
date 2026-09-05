---
name: run-poozari
description: Launch the poozari stack locally — Postgres on :5433, the NestJS API on :4000, and the Next.js web app on :3000 — and smoke-test it. Use when asked to run, start, serve, or screenshot the app, or to confirm a change works in the real app rather than only in tests.
---

# Running poozari locally

Three processes, started in this order. Postgres is **not** a service — it
must be started by hand before `pnpm dev`, or the API dies on boot with a
Prisma connection error.

## 1. Postgres (required first)

This project uses an isolated PG17 instance in `.pgdata/` on **port 5433**,
deliberately separate from the system Postgres on 5432. Do not point the app
at 5432.

```bash
"/c/Program Files/PostgreSQL/17/bin/pg_ctl.exe" \
  -D "C:\projects\poozari\.pgdata" -o "-p 5433" \
  -l "C:\projects\poozari\.pgdata\server.log" start
```

- `pg_ctl: another server might be running; trying to start server anyway` is
  a **stale `postmaster.pid` from an unclean shutdown, not a real conflict**.
  It starts fine. Confirm with the port check below rather than trusting the pid file.
- Startup can take ~40s when it fsyncs the data directory after a hard stop.

Verify it is actually listening (an empty result means it is NOT up):

```bash
PGPASSWORD='<see apps/api/.env>' "/c/Program Files/PostgreSQL/17/bin/psql.exe" \
  -h localhost -p 5433 -U admin_poozari -d poozari -tAc 'select 1'
```

### DATABASE_URL must say 5433

`apps/api/.env` has drifted to a dead port before (5544). If the API cannot
connect, check this first:

```bash
grep DATABASE_URL apps/api/.env   # want localhost:5433/poozari
```

### Seeding

The DB is normally already seeded. Check before re-seeding — reseeding is not
needed just because the app is starting:

```bash
PGPASSWORD='...' psql -h localhost -p 5433 -U admin_poozari -d poozari \
  -c 'select (select count(*) from "User") users, (select count(*) from "Puja") pujas;'
```

A healthy seeded DB has 23 tables, 6 users, 5 pujas, 6 products, 3 live
sessions. If empty: `pnpm --filter @poozari/api seed`.

## 2. API and web

Run each separately (rather than root `pnpm dev`) so the logs stay readable
and either can be restarted alone:

```bash
pnpm --filter @poozari/api dev > /tmp/poozari-api.log 2>&1   # background, :4000
pnpm --filter @poozari/web dev > /tmp/poozari-web.log 2>&1   # background, :3000
```

Timing — poll, do not assume a hang:
- API is ready in ~13s. Look for `poozari API listening on http://localhost:4000/api`.
- Web reports `Ready` in ~14s, but the **first request to any route triggers a
  40s+ compile**. A curl that times out during first compile is not a failure;
  Next.js logs `The user aborted a request. Retrying 1/3...`. Use
  `--max-time 90` on the first hit of each route.

## 3. Drive it

Do not stop at "the port is open." Confirm data actually flows end to end:

```bash
curl -s http://localhost:4000/api/pujas | head -c 200          # seeded data
curl -s -o /dev/null -w '%{http_code}\n' \
  http://localhost:4000/api/bookings/me                        # expect 401 (global guard)

# admin login -> token -> authed route
TOK=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@poozari.com","password":"admin12345"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
curl -s -H "Authorization: Bearer $TOK" http://localhost:4000/api/admin/dashboard
```

Web — the real check is that an SSR page renders API data, not just a 200:

```bash
curl -s --max-time 90 http://localhost:3000/puja/narayan-nag-bali-puja \
  | grep -o '<title>[^<]*</title>'
# want: <title>Narayan Nag Bali Puja — poozari.com</title>
```

Known-good slugs for dynamic routes: `narayan-nag-bali-puja` (puja, book),
`pure-cow-ghee-diyas` (product).

## Logins and mock modes

- Super Admin `admin@poozari.com` / `admin12345` -> `/admin/login`
- Pandit `pandit.varanasi@poozari.com` / `pandit12345` -> `/pandit/login`
- Customer: any mobile via OTP -> `/login`. `OTP_DEV_MODE=true` shows the code
  on screen instead of sending SMS.
- `RAZORPAY_KEY_ID=rzp_test_dev` is not a real key, so payments auto-confirm in
  mock mode. The full booking -> assignment -> video and Live Darshan paywall
  flows are exercisable without live keys.

## Stopping

The dev servers are plain background processes. Stop Postgres explicitly,
otherwise the next start replays WAL and takes ~40s:

```bash
"/c/Program Files/PostgreSQL/17/bin/pg_ctl.exe" -D "C:\projects\poozari\.pgdata" stop
```
