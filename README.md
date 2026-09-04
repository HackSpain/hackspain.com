# HackSpain

Monorepo for [HackSpain](https://hackspain.com) (Hack Spain 2026, Madrid).

| App | Stack | Default URL |
| --- | --- | --- |
| `apps/web` | Astro 6, React islands, Tailwind v4, Neon/Drizzle | [localhost:4321](http://localhost:4321) |
| `apps/app` | Next.js, Convex, Convex Auth, shadcn | [localhost:3000](http://localhost:3000) |

Package manager is Bun. Node.js ≥ 22.12.

## Setup

```sh
bun install
cp apps/web/.env.example apps/web/.env
cp apps/app/.env.example apps/app/.env.local
```

Landing static pages run without a database. Signup and ambassador APIs need `DATABASE_URL` (Neon PostgreSQL). Optional `DISCORD_WEBHOOK_URL` notifies Discord on new submissions. `SHORTLIST_PASSWORD` gates the internal `/shortlist` review page; without it the page renders no data.

The dashboard needs a Convex development deployment (`bun dev:convex` / `npx convex dev`). Do not use `npx convex deploy` unless you are shipping production. Dashboard env lives in `apps/app/.env.example`.

## Commands

| Command | Description |
| :------ | :---------- |
| `bun dev` / `bun dev:web` | Landing dev server |
| `bun dev:app` | Dashboard Next.js server |
| `bun dev:convex` | Convex functions + codegen (development only) |
| `bun build` / `bun build:app` | Production builds |
| `bun preview` | Preview the landing build |
| `bun check` | Astro + TypeScript checks |
| `bun migrate:convex` | Import Neon signups/ambassadors into Convex |
| `bun db:generate` / `bun db:migrate` / `bun db:push` | Landing Drizzle |

## Convex auth and admin

1. From the repo root, run `bun dev:convex`. From `apps/app`, run `bun run dev:convex`. Create or select a **dev** project. Leave it running.
2. Set Convex env (in another terminal, still from `apps/app`):

```sh
npx convex env set SITE_URL http://localhost:3000
npx convex env set ADMIN_EMAILS you@example.com
npx convex env set MIGRATION_SECRET "$(openssl rand -hex 24)"
# optional email delivery; without this, OTPs print in Convex logs
npx convex env set AUTH_RESEND_KEY re_...
npx convex env set AUTH_EMAIL "HackSpain <onboarding@resend.dev>"
# dev only: allow the phone-verification stub (no Twilio). Never set in production.
npx convex env set ALLOW_PHONE_STUB true
# dev only: 00000000 also works as the email sign-in code (ignored if AUTH_RESEND_KEY is set).
npx convex env set ALLOW_EMAIL_OTP_STUB true
```

3. Copy the printed `CONVEX_URL` into `apps/app/.env.local` as `NEXT_PUBLIC_CONVEX_URL`.
4. Generate Convex Auth JWT keys once:

```sh
cd apps/app
npx @convex-dev/auth
```

5. Sign in at `/login` with an email that exists in Convex `signups`. An organizer must mark that signup **accepted** in `/admin` before the person can confirm details.

### Confirming details

Accepted hackers confirm phone (E.164 + code), dietary restrictions, travel origin, and attend/cancel. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` on the Convex deployment to deliver codes via SMS (partial config fails loudly). Without Twilio, the phone code is only logged and returned as a stub when the Convex env `ALLOW_PHONE_STUB=true`; otherwise the request fails with "SMS is not configured". The number is not auto-confirmed. Import marks Neon `approval_status = confirmed` (and shortlist `finalSelected`) as accepted. Everyone else stays unaccepted until CRM.

## Migrating Neon to Convex

`bun migrate:convex` from the repo root. Idempotent on email. Safe to re-run. Do not run it unless you mean to import.

It loads `DATABASE_URL` from `apps/web/.env`, and `NEXT_PUBLIC_CONVEX_URL` plus `MIGRATION_SECRET` from `apps/app/.env.local`. Shell exports win if already set. `MIGRATION_SECRET` must match the Convex deployment env.

The script upserts `hackathon_signups` and `ambassador_applications` into Convex. Emails with `finalSelected` in the landing shortlist JSON are marked accepted. Re-runs do not clear an admin’s accepted flag. It does not copy the rest of the shortlist into Convex.

## Design

Landing and dashboard share these tokens:

- paper `#f4ecd8`, sand `#e8dcc4`, gold `#eab619`, orange `#d96b2a`, red `#cc291f`, brown `#4a2c1f`, slate `#8fb8d1`, teal `#35858a`, navy `#1e3958`, ink `#2a170f`
- DM Sans (body), Bungee (display / buttons)

`/shortlist` stays on the landing app only (noindex, PII). It is server-rendered and gated by `SHORTLIST_PASSWORD`. It is not part of the dashboard.

## Deploy

Point separate Vercel projects at `apps/web` and `apps/app`. Keep Convex on a development deployment until you are ready for a production deploy.
