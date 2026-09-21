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
- Customer: any mobile number **or email address** via OTP (dev mode shows the
  code on screen) → `/login`. First code verified creates the account.
- Test customer with a password: `9000000009` / `customer12345` → `/login`, then
  "Sign in with password". Seeded with a completed booking and saved sankalp
  details so the account pages are not empty; re-seeding resets its password.
  The password login accepts an email too, once the account has one saved.
  Override with `SEED_CUSTOMER_PHONE` / `SEED_CUSTOMER_PASSWORD`, and remove the
  account before going live.

### Payments (Razorpay Standard Checkout)
Configured with test keys and talking to Razorpay for real. See the Payments
section below for the full picture.

When `RAZORPAY_KEY_ID` is *not* a real key, payments fall back to mock mode: the
checkout is auto-confirmed so you can exercise the full booking → assignment →
video flow without a Razorpay account. The same mock mode applies to Live
Darshan join-fee payments.

## Languages

The site is published in **English, हिन्दी, Français and Español**.

- English keeps the bare URL (`/puja/rudra-abhishek`); the others are prefixed
  (`/hi/...`, `/fr/...`, `/es/...`), so every translation has its own indexable
  URL and existing links keep working. `/en/...` redirects to the bare path, so
  there is no duplicate content.
- A first-time visitor is sent to the language their browser asks for, then the
  choice is remembered in a cookie. Set `localeDetection: false` in
  `apps/web/src/i18n/routing.ts` to always open in English.
- Copy lives in `apps/web/messages/{en,hi,fr,es}.json`. **English is the source
  of truth**: every catalogue is layered over `en.json`, so a key that has not
  been translated yet renders its English text rather than a raw key. That lets
  translation land page by page without the site ever looking broken.
- Inside the app, import `Link`, `useRouter` and `usePathname` from
  `@/i18n/navigation` — never from `next/*`. The wrappers keep the reader in the
  language they are already browsing.

### What is translated so far
- Site chrome (navigation, footer, switchers) — all four languages.
- About Us, How It Works, Blog, Contact, Enquiry, Become a Pujari — all four.
- The four policy pages — English and Hindi in full.
- **Not yet translated:** the copy on the pre-existing pages (home, puja and
  product listings and details, booking, checkout, FAQ, account). Those strings
  are still hardcoded in the components, so they render in English in every
  language. Extracting them into the catalogues is the remaining i18n work.
- The Super Admin and pandit panels are deliberately English only.
- The French and Spanish policy pages intentionally fall back to the English
  text. A privacy or refund policy carries different obligations in the EU, so
  those need a lawyer's localisation rather than a translation.

Catalogue content (puja titles, descriptions, product copy) is **not**
translated — it is stored once and shown as entered in every language.

## Currency

A currency switcher sits beside the language switcher: **INR, USD, EUR, GBP**
out of the box, editable under Admin -> Currencies.

**It changes what a visitor sees, not what they are charged.** Every amount in
this codebase is INR (`priceInr`, `amountInr`) and Razorpay bills in rupees; the
customer's own bank does the conversion. That keeps refunds exact and avoids FX
settlement. Consequences worth knowing:

- Browse prices (puja cards, packages, products, live-darshan join fees) show
  the reader's currency.
- Anything about to be paid shows the converted price **and** the exact rupee
  charge, and the "Pay" button always states rupees.
- Admin and pandit screens, and a customer's own booking/order history, stay in
  INR — those are settled amounts, and re-converting them at today's rate would
  misstate what was actually charged.
- Rates are maintained by hand. There is no live feed; `DEFAULT_CURRENCIES` in
  `packages/shared/src/currency.ts` seeds indicative starting values. INR is the
  base and is pinned at 1.

Prices are server-rendered in INR and swap to the reader's currency on
hydration, which keeps the pages static at the cost of a brief flash of rupees
on first paint for non-INR readers.

## Site pages

Content pages beyond the catalogue:

| Page | Route | Source of content |
| --- | --- | --- |
| About Us | `/about` | message catalogues + live city/puja counts |
| How It Works | `/how-it-works` | message catalogues |
| Blog | `/blog`, `/blog/[slug]` | database, written in Admin -> Blog |
| Contact Us | `/contact` | form -> Admin -> Inbox |
| Puja Enquiry | `/enquiry` | form -> Admin -> Inbox |
| Become a Pujari | `/become-a-pujari` | form -> Admin -> Applications |
| Privacy Policy | `/privacy-policy` | message catalogues |
| Terms & Conditions | `/terms-and-conditions` | message catalogues |
| Cancellation & Refund | `/cancellation-and-refund` | message catalogues |
| Shipping Policy | `/shipping-policy` | message catalogues |

The four policy pages are **drafts written against how the platform actually
works** — they describe the real refund windows, the INR-only charging, video
delivery and prasad dispatch. They still need your lawyer's review before
launch; the revision date shown on them is `POLICY_REVISED` in
`apps/web/src/components/legal-page.tsx`.

### Blog

Posts are written in Admin -> Blog and published without a deploy. Bodies are
Markdown, rendered by `apps/web/src/components/markdown.tsx` — a small renderer
that builds React elements rather than injecting HTML, so there is nothing to
sanitise. It supports headings, paragraphs, lists, blockquotes, fenced code,
rules, and inline bold/italic/code/links. Drafts are invisible to the public
API; publishing stamps `publishedAt`, and moving back to draft clears it.

### Forms and inboxes

Every submission is stored, never only emailed:

- Contact Us and puja enquiries share one `Inquiry` table and one admin inbox,
  filterable by type and status, with internal notes per message.
- "Become a Pujari" applications land in `PanditApplication` with a
  NEW -> REVIEWING -> SHORTLISTED -> APPROVED/REJECTED pipeline and verification
  notes. Approving does **not** create a login — an admin still adds the pandit
  under Admin -> Pandits or via the bulk CSV import.

## Images in the admin forms

The puja and product forms take an image two ways: pick a file from the machine
(or drag one onto the preview), or paste a URL you already host elsewhere. Both
end up in the same `imageUrl` field, so nothing downstream changes.

`ImagePicker` (`apps/web/src/components/image-picker.tsx`) is the shared field —
preview, upload, replace, remove, and a "Use a URL" escape hatch. It drops into
any form with an `imageUrl`: the blog cover, live-darshan thumbnails and the
catalog entities (city, temple, deity, festival, benefit) still use plain URL
inputs and would each take one line to switch over.

Uploads go to `POST /api/admin/uploads/image` (Super Admin only, multipart,
field `file`), which returns `{ url }`. Both the MIME type **and** the file
extension are checked — a browser-supplied MIME is trivially spoofed, and an
extension says nothing about the bytes — and the limit is 5 MB. JPG, PNG and
WebP only.

### Uploads are stored as absolute URLs

`savePublicFile` returns e.g. `http://localhost:4000/uploads/abc.png`, not a
bare `/uploads/abc.png`. The API and the web app are separate origins, so a
relative path resolves against the web app (:3000), which does not serve
uploads at all. Storing the absolute URL means the site, the admin panel and a
future mobile app can all use the value as-is, with no path-rewriting helper at
every render site.

Set **`PUBLIC_BASE_URL`** to the API's public origin in production, or uploaded
images and pooja videos will carry `http://localhost:4000` into your database.
Moving the API to a new domain later means rewriting the stored URLs.

> This also fixed a live bug: in-app pooja video uploads were storing the
> relative path, so a recorded video could never be played back in the browser.
> One seeded booking was affected and has been migrated.

## Booking over WhatsApp

Devotees can start a booking in chat instead of the checkout — the number is
**+91 90413 99200**, set with `NEXT_PUBLIC_WHATSAPP_NUMBER`.

The pre-filled message carries the context, so the conversation opens with the
details rather than "which puja did you mean?":

```
Namaste 🙏
I would like to book this puja:

*Narayan Nag Bali Puja*
Package: Standard
Price: ₹21,000
https://poozari.com/puja/narayan-nag-bali-puja
```

Where the buttons sit:

| Placement | Button | Message carries |
| --- | --- | --- |
| Every public page | floating chat button, bottom-right | the page URL |
| Puja detail (package picker) | Book on WhatsApp | puja, selected package, rupee price |
| Booking form | Book on WhatsApp, beside the online payment | puja, package, rupee price |
| Product detail | Order on WhatsApp | product, quantity, rupee total |
| Live darshan | Join via WhatsApp | session title, join fee |
| Contact page | WhatsApp card with the number | the page URL |
| Footer | the number as a chat pill | the page URL |

Details worth knowing:

- The message follows the language being read — a devotee on `/hi/...` sends a
  Hindi message. Templates live in `packages/shared/src/whatsapp.ts` (not in the
  web catalogues, because `*bold*` there is WhatsApp's own markup).
- Prices in the message are always the **rupee** amount, even when the reader
  is browsing in another currency: that is what will actually be charged.
- The buttons are real `wa.me` links with `target="_blank"`, not scripted
  `window.open` calls, so popup blockers, middle-click and long-press all
  behave. The page URL is attached on click rather than during render, which
  would not have matched the server-rendered HTML.
- The buttons use WhatsApp's own green (`#25D366`, darkening to `#1EBE5B` on
  hover) via the `.btn-whatsapp` class in `globals.css`, so they read as
  WhatsApp rather than as one of the site's saffron accent buttons.
- The staff panels do not show the chat button — they are tools, not places to
  start a booking.

### Following up on WhatsApp bookings

Clicking a booking button records the intent in the same admin inbox as Contact
Us and enquiries, under the **WhatsApp** filter, with a "Reply on WhatsApp"
link back to the devotee.

This is recorded **only for signed-in devotees**, by way of the endpoint not
being `@Public()`. For anyone else we have no number to follow up on, and an
inbox full of contactless clicks would bury the messages that can be answered.
The log is fire-and-forget: WhatsApp opens whether or not it succeeds, because
a failed log must never cost a booking. Each row states plainly that it is a
click, not a confirmed message — the devotee may never have pressed send.

WhatsApp is an **additional** route, not a replacement: online checkout stays
the primary path, and a booking arranged in chat is still entered through the
admin panel so it gets a pandit, a reference and a video like any other.

## Payments

Razorpay Standard Checkout, in three flows: puja bookings, product orders and
live-darshan join fees.

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. With no real key the gateway
runs in mock mode (synthetic order ids, signatures always accepted) so the whole
flow is exercisable offline. `rzp_test_*` keys count as real: they reach
Razorpay, they just do not move money.

### The amount always comes from the server

There is deliberately **no generic `POST /api/create-order` taking an amount
from the request body**. Each endpoint derives the amount from a stored record:

| Flow | Create order | Verify |
| --- | --- | --- |
| Puja booking | `POST /api/payments/:bookingId/order` | `POST /api/payments/:bookingId/verify` |
| Product order | `POST /api/product-orders/:id/payment-order` | `POST /api/product-orders/:id/verify-payment` |
| Live darshan | `POST /api/live/:sessionId/order` | `POST /api/live/:sessionId/verify` |

A client-supplied amount would let anyone pay ₹1 for a ₹21,000 puja. Tying the
order to a record it must match closes that off, and it is why the endpoint
names are resource-scoped rather than generic.

### Signature verification

`HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id)` keyed with
`RAZORPAY_KEY_SECRET`, compared with `crypto.timingSafeEqual` — a plain `===`
leaks through its timing how much of a forged signature was right.

On mismatch or missing fields the endpoint returns **400 and does not mark
anything paid**; bookings and product orders additionally record the payment as
`FAILED`. Only a matching signature advances the record.

### Where the keys live

`RAZORPAY_KEY_SECRET` is read in exactly one file
(`apps/api/src/payments/payment-gateway.service.ts`), held `private`, and never
serialised into a response.

The **key id reaches the browser in the create-order response**, not through a
`NEXT_PUBLIC_RAZORPAY_KEY_ID` variable. One source of truth means the key in the
modal cannot disagree with the account that created the order, and there is no
second place to update when keys rotate.

### Checkout on the front end

`apps/web/src/lib/razorpay.ts` loads `checkout.js` once per page and opens the
modal. All three flows go through it, so none can be left missing a case:

- **Success** → verify server-side, then redirect; a failed verification shows
  its message instead of vanishing into an unhandled promise.
- **Modal dismissed** → the button re-enables and the customer is told the
  record is saved and unpaid, with where to go to pay it.
- **`payment.failed`** (declined card, failed mandate) → the reason is shown,
  with a note that no money was taken.

While the modal is open the submit button stays disabled, so a second booking
cannot be started underneath it.

### Test cards

Use Razorpay's test cards, e.g. **4111 1111 1111 1111**, any future expiry, any
CVV, and any OTP on the simulated 3-D Secure screen. Test-mode payments appear
in the Razorpay dashboard but move no money.

## Email

Outgoing email over SMTP. The app **sends** notifications; it never reads a
mailbox, so no IMAP settings are needed.

Configure with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and
optionally `SMTP_FROM` and `NOTIFY_EMAIL`. Port 465 uses implicit TLS, 587
STARTTLS — the service picks the right mode from the port number. **With none
of these set, emails are written to the server log instead of being sent**, so
local development and tests never reach a mail server.

### What gets sent

| Trigger | Goes to | Contains |
| --- | --- | --- |
| Contact Us submitted | `NOTIFY_EMAIL` | the message, with `Reply-To` set to the sender |
| Puja enquiry submitted | `NOTIFY_EMAIL` | the message plus puja, city and preferred date |
| Pujari application | `NOTIFY_EMAIL` | applicant details, `Reply-To` the applicant |
| Payment succeeds | the devotee | reference, puja, package, amount, date, what happens next |
| Pooja video attached | the devotee | a link to watch it in their account |

Bodies live in `apps/api/src/email/email.templates.ts`, kept apart from
delivery so the wording can be reviewed without touching transport code. They
are plain text on purpose: these are short transactional notes, and a text body
cannot break its own layout or trip a spam filter on a malformed template.

### Failure is never fatal

`EmailService.send()` returns a boolean rather than throwing, and every call
site fires it without awaiting. A booking must not fail because a mail server
was briefly unreachable — the record is already saved, and every form
submission also lands in the admin inbox, so nothing is lost if a message goes
astray. Failures are logged with the reason.

### Checking it works

From the admin panel's own API:

```bash
TOKEN=...   # Super Admin
# Authenticate against the SMTP server without sending anything
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/email/status
# Send a real test message to NOTIFY_EMAIL
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/email/test
```

`status` separates a credentials problem from a delivery one: it reports
whether SMTP is configured, which host and from-address are in use, and the
result of an authentication handshake.

Links inside emails are built from **`WEB_BASE_URL`** (defaults to
`http://localhost:3000`). Set it, or customers will receive localhost links.

## OTP login

Customers sign in at `/login` with a one-time code sent to **either a mobile
number or an email address** — the `Mobile` / `Email` toggle on the card picks
the channel, and the API takes exactly one of `phone` or `email` (sending both
is a 400).

**There is no signup page: the first verified code creates the account.** An
identifier nobody has used before is upserted into a new `CUSTOMER` on verify,
named from the optional Name field or `Devotee`. This is why `/login` is headed
"Create account or sign in".

- `SMS_PROVIDER` selects the gateway: `fast2sms` (the default when a Fast2SMS
  key is present), `msg91`, `twilio`, or `log` for local work. Each provider is
  one adapter in `apps/api/src/sms/sms.service.ts`.
- Email codes go out over the same SMTP transport as every other message
  (`SMTP_*`, see the Email section). Unlike the notification emails, a login
  code is **not** fire-and-forget: if `EmailService.send` reports failure — and
  it reports failure when SMTP is simply unconfigured — the request answers 503
  and the code is retired, rather than parking the devotee on the code screen
  waiting for mail that was never sent.
- `OTP_DEV_MODE=true` returns the code in the API response instead of sending an
  SMS or an email. **It must be set explicitly** — a deploy that forgets the
  variable sends for real rather than handing out login codes over the API.
- Requesting a code is rate limited per identifier *per channel*: one every 60
  seconds, at most 5 an hour. A number and an address are counted separately.
  The login screen counts the resend button down to match.
- Issuing a new code retires any outstanding one, so only the newest works.
- A code is burnt after 5 wrong guesses — six digits is otherwise guessable.
- If delivery fails, the stored code is retired immediately rather than left to
  count against the hourly limit.
- An emailed code is refused for a **staff** address: `admin@poozari.com` and
  the pandits carry an email, and without that check a code would mint a
  SUPER_ADMIN or PANDIT token and walk past their password login. They keep
  using `/admin/login` and `/pandit/login`.
- Codes live in `OtpCode`, keyed on `(identifier, channel)` — `identifier` is a
  bare 10-digit number or a lowercased address, with no FK, because a code has
  to exist before the account does.

Mobile stays India-only (`+91`, `[6-9]` then 9 digits); the email channel is the
way in for everyone else until multi-country SMS is worked out.

## Customer details

A devotee's profile (`/account/profile`) holds the details a sankalp needs:
name, email, date of birth, gender, **gotra**, address, city, state and pincode.
Saved once, they pre-fill the booking form every time — only blank fields are
filled, so anything typed on the booking form itself wins. A partial save never
wipes details entered earlier.

## Bulk CSV import (Super Admin)

`/admin/import` loads pujas and pandits a sheet at a time. Same page, two tabs.

1. **Download the template** — a CSV with the exact headers plus two filled-in
   example rows (or headers only). Generated client-side from the column
   definitions in `packages/shared/src/csv.ts`, so the template and the
   validator can never drift apart.
2. **Upload the filled sheet** — the file is checked immediately and nothing is
   written yet. Every problem is reported against its spreadsheet cell
   (`row 4 · locationType · Use HOME, TEERTH or TEMPLE`), and a row reports all
   of its problems at once rather than one per upload.
3. **Import** — writes every row in one transaction.

**A file is applied whole or not at all.** If any row is invalid the import is
refused and nothing is written, so a rejected upload never leaves a
half-imported catalog to reconcile by hand.

### Sheet conventions
- Multi-value cells are separated with `|` — commas belong to the CSV itself:
  `Health|Prosperity`, `221001|221002`.
- Headers are matched loosely: `Package 1 Name`, `package1_name` and
  `PACKAGE1_NAME` all land on the same field.
- Booleans accept `TRUE/FALSE/yes/no/1/0`; prices accept `5,100` and `₹5100`.
- Blank `slug` is derived from the title. Blank `city` on a puja with a temple
  is taken from that temple.
- Pujas carry their packages in `packageN_*` column groups. The template ships
  three; add `package4_name`, `package4_priceInr`, … and they are picked up
  automatically. Partly-filled slots are an error, not silently dropped.
- Cities and temples must already exist (they carry data a CSV cannot supply).
  Deities, festivals and benefits can be created on the fly with the
  **Create missing tags** checkbox — otherwise an unknown tag is an error.
- Pandits with a blank `password` get a generated one, listed in the result and
  downloadable as a logins CSV. Shown once, so save it then.

### Modes
- **Create new only** (default) — a row whose slug/email already exists is an error.
- **Create + update existing** — matched on puja `slug` or pandit `email`.

An update writes **only the columns the sheet carries**, so a narrow sheet is a
safe way to correct one field in bulk:

| In the sheet | Result on update |
| --- | --- |
| Column present, cell filled | Field set to that value |
| Column present, cell blank | Field cleared (tags/relations unlinked) |
| Column absent entirely | Field keeps its current value |

Package columns follow the same rule: present means the puja's packages are
replaced by what the sheet lists, absent means it keeps the ones it has (a new
puja still needs at least one). A pandit keeps their current password unless
the `password` column supplies a new one.

At most 1000 rows per upload (`BULK_IMPORT_MAX_ROWS`).

Endpoints: `POST /api/admin/import/pujas` and `POST /api/admin/import/pandits`,
both taking `{ csv, mode, dryRun, createMissingTags }`.

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

## Going live

Nothing in this repository holds a real credential — `apps/api/.env` and
`apps/web/.env.local` are gitignored, and the `.env.example` files carry
placeholders only. Every value below has to be set on the host.

### Rotate the seeded passwords first

**This repository is public, and the development default passwords are in it.**
Anyone who reads the README knows `admin@poozari.com` / `admin12345`. Before a
live site is reachable:

```bash
SEED_ADMIN_PASSWORD=<strong>     # or the admin panel is open to the world
SEED_PANDIT_PASSWORD=<strong>
SEED_TEST_CUSTOMER=false         # no known-password account on a live site
```

`prisma/seed.ts` refuses to run with `NODE_ENV=production` unless the first two
are set, so a production database cannot quietly end up with the published
defaults. The old values are already in the git history, so rotating is the
only fix — changing the README does not unpublish them.

### Required environment

| Variable | Why it matters if wrong |
| --- | --- |
| `DATABASE_URL` | — |
| `JWT_SECRET` | still `dev-secret-change-me` locally; a known secret lets anyone mint an admin token |
| `OTP_DEV_MODE` | **leave unset.** `true` returns login codes in the API response instead of sending SMS |
| `CORS_ORIGIN` | the live site's origin, or the browser blocks every API call |
| `PUBLIC_BASE_URL` | the API's public origin. Uploaded images and pooja videos are stored as absolute URLs against it |
| `WEB_BASE_URL` | the site's public origin. Links inside customer emails are built from it |
| `RAZORPAY_KEY_ID` / `_SECRET` | test keys take no money; swap for live keys when you are ready to charge |
| `SMTP_*`, `NOTIFY_EMAIL` | unset means notifications are logged, not sent |
| `SMS_PROVIDER`, `FAST2SMS_API_KEY` | unset means no OTP is delivered and nobody can sign in |
| `NEXT_PUBLIC_API_URL`, `API_URL` | the web app's view of the API |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | baked in at build time, so it needs setting *before* `pnpm build` |

`NEXT_PUBLIC_*` values are compiled into the browser bundle. Changing one means
rebuilding the web app, not just restarting it.

### Deploy steps

```bash
git pull
pnpm deploy:server      # install, shared, migrate, generate, api, web
# then restart the API and web processes (pm2 restart all, systemctl, …)
```

`deploy:server` is the sequence below in one command:

```bash
pnpm install --frozen-lockfile
pnpm --filter @poozari/shared build
pnpm --filter @poozari/api exec prisma migrate deploy   # never `migrate dev`
pnpm --filter @poozari/api exec prisma generate
pnpm --filter @poozari/api build
pnpm --filter @poozari/web build                        # after the env is set
pnpm --filter @poozari/api seed                         # optional, guarded, NOT in the script
```

### "I pulled but nothing changed"

**`git pull` alone never updates a running site.** Everything the browser and
Node actually execute is a build artifact, and build artifacts are gitignored
— pulling replaces `src/`, not `dist/` or `.next/`. Four things bite, in
rough order of how often:

1. **The migration did not run.** New tables and columns do not arrive with a
   pull. Until `prisma migrate deploy` runs, the API 500s on anything touching
   them — add-ons are the current example.
2. **`packages/shared` was not rebuilt.** The API and web both resolve it
   through `dist/`, so a pull leaves them compiling against the *old* shared
   package and new client methods and types simply are not there.
3. **The web app was not rebuilt.** `.next/` is the site; unbuilt, the server
   keeps serving the previous compile no matter what is in `src/`.
4. **The processes were not restarted.** Node holds the old `dist/main.js` in
   memory until it is told otherwise.

**Do not commit `.next/` or `dist/` to work around this.** `NEXT_PUBLIC_*`
values are frozen into the bundle at build time, so a build made on a laptop
carries `http://localhost:4000/api` inside it — deploy that and every visitor's
browser calls their own machine. The build has to happen on the host, after
the host's env is set.

Uploads are written to `UPLOAD_DIR` (default `apps/api/uploads`) and served by
the API. On a host with an ephemeral filesystem that directory needs to be a
mounted volume, or uploaded images and videos vanish on redeploy.

### Still localhost-only

Nothing here has been run against a real domain. The two things most likely to
bite on first deploy are `CORS_ORIGIN` (every API call fails) and the
`PUBLIC_BASE_URL` / `WEB_BASE_URL` pair (images and email links point at
localhost).

## Validation status
- `pnpm --filter @poozari/shared typecheck` ✅
- `pnpm --filter @poozari/api typecheck` / `build` ✅
- `pnpm --filter @poozari/web typecheck` / `build` ✅ (24 routes)
- End-to-end smoke test ✅ — booking → assignment → video, Live Darshan
  create → go-live → paywall → pay → unlock → end, and in-app video upload all
  verified against the local Postgres instance.
- Bulk CSV import ✅ — template round-trip, Excel-flavoured CSV (BOM, CRLF,
  quoted commas, embedded newlines, loose headers), per-cell error reporting,
  tag auto-creation, create/upsert modes, generated-password login, row cap and
  a 1.5 MB payload all verified against the local Postgres instance. The
  `/admin/import` page compiles and serves; its UI has not been clicked through
  in a browser.
- Languages ✅ — 4-locale routing verified (bare English, prefixed hi/fr/es,
  `/en/*` redirecting, unknown locale 404), translated copy served on each new
  page, and English fallback confirmed for untranslated keys.
- Currency ✅ — rate CRUD, INR base protection, activate/deactivate/delete, and
  conversion formatting for all four currencies.
- Site pages ✅ — all 10 render with correct per-language titles; the three forms
  accept valid input and reject bad input per field; blog draft/publish/unpublish
  visibility verified end to end.
- OTP ✅ — resend cooldown, hourly cap, per-number isolation, single-use codes and
  the 5-attempt lockout all verified. No live SMS was sent during testing.
- Customer details ✅ — profile round-trip, partial-save preservation and pincode
  validation verified.
- WhatsApp booking ✅ — per-language pre-filled messages verified in the rendered
  HTML on the home, puja, product and contact pages; context (puja, package,
  rupee price) confirmed in the puja CTA; the lead endpoint rejects anonymous
  callers and its record lands in the admin inbox with full context; the chat
  button stays off the staff panels.
- Client message payload trimmed to the namespaces client components actually
  read, which took a Hindi page from 151 KB to 111 KB of HTML.
- Admin image upload ✅ — a real PNG uploads, the returned absolute URL serves
  with the right content type, and saving it onto a puja round-trips to the
  public API. Rejections verified: wrong extension, non-image MIME, missing
  file, no auth (401) and a pandit token (403).
- Pooja video playback ✅ — the legacy relative `/uploads/...` path is migrated
  and the seeded recording now serves over HTTP.
- Email ✅ — SMTP authenticates on both 465 and 587; a test message was accepted
  by the server. All four notification paths verified end to end against a real
  mailbox: Contact Us, pujari application, booking confirmation after payment,
  and the pooja-video notice. Admin `email/status` and `email/test` are Super
  Admin only (401 anonymous, 403 pandit).
- Razorpay ✅ — a real order was created against the test account
  (`order_TaJBYGGJhuO3J9`, ₹6,100, `devMode: false`). Signature verification
  confirmed three ways: a forged signature returns 400 and leaves the booking
  `PENDING_PAYMENT` with the payment `FAILED`; missing fields return 400; a
  correctly computed HMAC advances the booking. The sub-₹1 guard rejects with
  400 before Razorpay is called, and the SDK's `statusCode: 401` on bad
  credentials matches the 401 mapping.
- None of the new UI has been clicked through in a browser.

## Build phases
- **Phase 0** Foundation: monorepo, schema, auth/RBAC. ✅ in progress
- **Phase 1** MVP: public site + customer booking + Super Admin assignment.
- **Phase 2** Video + full pandit/customer panels.
- **Phase 3** Mobile apps (Expo).
- **Phase 4** Polish, i18n, launch.
