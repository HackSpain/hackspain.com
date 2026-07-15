/// <reference types="astro/client" />

interface Window {
  __hsAnalyticsConsent?: "granted" | "denied" | null;
}

interface ImportMetaEnv {
  readonly DATABASE_URL?: string;
  /** Discord channel webhook URL (server-only). New signups post here when set. */
  readonly DISCORD_WEBHOOK_URL?: string;
  /** Server-only secret used for the signup approvals admin area. */
  /** Server-only WhatsApp community invite included after approval. */
  readonly WHATSAPP_COMMUNITY_URL?: string;
  /** Canonical public origin used in transactional email links. */
  readonly SITE_URL?: string;
  /** Sentry DSN (public; embedded in client bundle). */
  readonly PUBLIC_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

declare module "*.txt?raw" {
  const content: string;
  export default content;
}
