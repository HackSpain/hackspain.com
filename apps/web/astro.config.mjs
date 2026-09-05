// @ts-check

import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import sentry from "@sentry/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hackspain.com",
  output: "server",
  adapter: vercel(),
  trailingSlash: "never",
  integrations: [
    react(),
    sentry({
      project: "javascript",
      org: "hackspain",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
