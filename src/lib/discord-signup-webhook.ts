import {
  formatHeardFromStored,
  formatOccupationStatuses,
} from "./signup-validation";

const DISCORD_WEBHOOK_PREFIXES = [
  "https://discord.com/api/webhooks/",
  "https://discordapp.com/api/webhooks/",
] as const;

/** Vercel (and other hosts) inject runtime env into `process.env`; Vite may bake `import.meta.env` only at build time. */
function discordWebhookFromRuntime(): string | undefined {
  const proc = (
    globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  const v = proc?.env?.DISCORD_WEBHOOK_URL;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function getWebhookUrl(): string | null {
  const raw =
    discordWebhookFromRuntime() ?? import.meta.env.DISCORD_WEBHOOK_URL;
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const u = raw.trim();
  if (!DISCORD_WEBHOOK_PREFIXES.some((p) => u.startsWith(p))) {
    console.warn(
      "DISCORD_WEBHOOK_URL ignored: must be a discord.com webhook URL"
    );
    return null;
  }
  return u;
}

function fieldVal(s: string, max: number): string {
  if (!s) {
    return "—";
  }
  const t = s.replace(/`/g, "'").slice(0, max);
  return t.length === 0 ? "—" : t;
}

export interface PreSignupDiscordPayload {
  email: string;
  fullName: string;
  githubUrl: string;
  linkedinUrl: string;
  webUrl: string;
  xUrl: string;
}

export async function notifyDiscordNewPreSignup(
  data: PreSignupDiscordPayload
): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    return;
  }

  const max = 1024;
  const embed = {
    title: "New HackSpain pre-signup",
    color: 0x2d_d4_bf,
    fields: [
      { name: "Name", value: fieldVal(data.fullName, max), inline: true },
      { name: "Email", value: fieldVal(data.email, max), inline: true },
      { name: "X", value: fieldVal(data.xUrl, max), inline: false },
      {
        name: "LinkedIn",
        value: fieldVal(data.linkedinUrl, max),
        inline: false,
      },
      { name: "GitHub", value: fieldVal(data.githubUrl, max), inline: false },
      { name: "Web", value: fieldVal(data.webUrl, max), inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: ctrl.signal,
    });
    if (res.ok) {
      console.info("Discord new pre-signup webhook ok", res.status);
    } else {
      const t = await res.text().catch(() => "");
      console.error(
        "Discord pre-signup webhook failed:",
        res.status,
        t.slice(0, 500)
      );
    }
  } catch (e) {
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message}${e.cause == null ? "" : ` (cause: ${String(e.cause)})`}`
        : String(e);
    console.error("Discord pre-signup webhook error:", detail);
  } finally {
    clearTimeout(timer);
  }
}

export interface SignupDiscordPayload {
  achievements: string;
  ambassadorMotivation: string;
  cameFromPreSignup: boolean;
  email: string;
  employer: string;
  freeTime: string;
  fullName: string;
  githubUrl: string;
  heardFrom: string[];
  linkedinUrl: string;
  occupationStatuses: string[];
  studyInstitution: string;
  wantsAmbassador: boolean;
  webUrl: string;
  xUrl: string;
}

export async function notifyDiscordNewSignup(
  data: SignupDiscordPayload
): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    return;
  }

  const max = 1024;
  const embed = {
    title: "New HackSpain application",
    color: 0xea_b6_19,
    fields: [
      { name: "Name", value: fieldVal(data.fullName, max), inline: true },
      { name: "Email", value: fieldVal(data.email, max), inline: true },
      {
        name: "Came from pre-signup",
        value: data.cameFromPreSignup ? "True" : "False",
        inline: true,
      },
      {
        name: "How they found us",
        value: fieldVal(formatHeardFromStored(data.heardFrom), max),
        inline: false,
      },
      { name: "X", value: fieldVal(data.xUrl, max), inline: false },
      {
        name: "LinkedIn",
        value: fieldVal(data.linkedinUrl, max),
        inline: false,
      },
      { name: "GitHub", value: fieldVal(data.githubUrl, max), inline: false },
      { name: "Web", value: fieldVal(data.webUrl, max), inline: false },
      {
        name: "Achievements",
        value: fieldVal(data.achievements, max),
        inline: false,
      },
      {
        name: "Free time / hobbies",
        value: fieldVal(data.freeTime, max),
        inline: false,
      },
      {
        name: "Studies or works",
        value: fieldVal(formatOccupationStatuses(data.occupationStatuses), max),
        inline: true,
      },
      {
        name: "University / centre",
        value: fieldVal(data.studyInstitution, max),
        inline: true,
      },
      {
        name: "Company / organisation",
        value: fieldVal(data.employer, max),
        inline: true,
      },
      {
        name: "Ambassador interest",
        value: data.wantsAmbassador ? "Yes" : "No",
        inline: true,
      },
      ...(data.wantsAmbassador
        ? [
            {
              name: "Why ambassador",
              value: fieldVal(data.ambassadorMotivation, max),
              inline: false,
            },
          ]
        : []),
    ],
    timestamp: new Date().toISOString(),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: ctrl.signal,
    });
    if (res.ok) {
      console.info("Discord new signup webhook ok", res.status);
    } else {
      const t = await res.text().catch(() => "");
      console.error("Discord webhook failed:", res.status, t.slice(0, 500));
    }
  } catch (e) {
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message}${e.cause == null ? "" : ` (cause: ${String(e.cause)})`}`
        : String(e);
    console.error("Discord webhook error:", detail);
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyDiscordSignupApiIssue(payload: {
  status: 400 | 500;
  error: string;
}): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    return;
  }

  const embed = {
    title:
      payload.status === 500
        ? "HackSpain signup API — server error"
        : "HackSpain signup API — client/validation error",
    color: payload.status === 500 ? 0xed_42_45 : 0xf0_b2_32,
    fields: [
      { name: "HTTP", value: String(payload.status), inline: true },
      { name: "error", value: fieldVal(payload.error, 256), inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(
        "Discord signup error webhook failed:",
        res.status,
        t.slice(0, 500)
      );
    }
  } catch (e) {
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message}${e.cause == null ? "" : ` (cause: ${String(e.cause)})`}`
        : String(e);
    console.error("Discord signup error webhook error:", detail);
  } finally {
    clearTimeout(timer);
  }
}
