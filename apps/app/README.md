# HackSpain dashboard

Next.js + Convex participant/admin app. Setup lives in the root [README](../../README.md).

```sh
bun run dev          # localhost:3000
bun run convex:dev   # development only
```

Production Convex deploys from the Vercel build (`bun run vercel-build`), not from a laptop. See the root [README](../../README.md#deploy).

Import Neon signups with `bun migrate:convex` from the repo root.
