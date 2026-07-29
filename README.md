# HackSpain

Public marketing site for [HackSpain](https://hackspain.com) — Hack Spain 2026, Madrid. Copy and SEO are Spanish-first.

## Tech stack

| Layer | Technologies |
| :---- | :------------- |
| **Framework** | [Astro 6](https://astro.build/) with server output (`output: "server"`) |
| **UI** | [React 19](https://react.dev/) islands, [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/) |
| **Hosting** | [Vercel](https://vercel.com/) via `@astrojs/vercel` |
| **Data** | [PostgreSQL](https://www.postgresql.org/) ([Neon](https://neon.tech/)) with [Drizzle ORM](https://orm.drizzle.team/) |
| **Forms & validation** | [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/) |
| **Email** | Nodemailer (SMTP), plain text |
| **Background jobs** | [Workflow](https://useworkflow.dev/) (`workflow/astro`) for follow-up flows |
| **Observability** | [Sentry](https://sentry.io/), [@vercel/analytics](https://vercel.com/docs/analytics), [@vercel/speed-insights](https://vercel.com/docs/speed-insights) |
| **Bot protection** | [BotID](https://botid.vercel.app/) on signup endpoints |
| **Tooling** | TypeScript, [Ultracite](https://www.ultracite.dev/) / Biome (`pnpm check`, `pnpm fix`), [Knip](https://knip.dev/) |

## Requirements

- [Node.js](https://nodejs.org/) **≥ 22.12**
- [pnpm](https://pnpm.io/) **10.x** (see `packageManager` in `package.json`)

## Getting started

```sh
pnpm install
cp .env.example .env
```

Apply the schema when working with the database (see [Database](#database)).

```sh
pnpm dev
```

Development server: [http://localhost:4321](http://localhost:4321).

## Scripts

| Command | Description |
| :------ | :---------- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build (`./dist/`) |
| `pnpm preview` | Preview production build locally |
| `pnpm astro check` | Astro and TypeScript checks |
| `pnpm check` | Lint and format (Ultracite / Biome) |
| `pnpm fix` | Auto-fix lint and format issues |
| `pnpm knip` | Find unused exports, dependencies, and files |

## Database

Schema and client live in `src/db/`. Drizzle Kit is configured in `drizzle.config.ts`.

| Command | Description |
| :------ | :---------- |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema (useful in development) |

## Signup workflow

The public application form lives at `/signup`. New applications are stored as
pending until they are reviewed. The accepted-candidate email reads its private
community link from `WHATSAPP_COMMUNITY_URL`, and pre-signup invitation links
use `SITE_URL` as their public origin. Every pre-signup also has a separate,
readable share code (for example, `disamtech-k7x9p`) that invitation emails use
in `/signup?ref=…`, so referrals can be attributed without exposing the private
prefill token.

## Project layout

```text
src/
├── components/     # React islands (pages, mosaic, UI, sections)
├── data/           # SEO copy, site metadata, llms.txt source
├── db/             # Drizzle client and schema
├── layouts/        # Astro layouts
├── lib/            # Shared server and client utilities
├── pages/          # File-based routes
└── workflows/      # Workflow definitions (e.g. pre-signup follow-up)
```
