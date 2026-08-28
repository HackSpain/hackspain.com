import type { AstroCookies } from "astro";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../db";
import type { PlayerMarketMagicLinkPurpose } from "../db/schema";
import {
  playerMarketCompanies,
  playerMarketMagicLinks,
  playerMarketSessions,
} from "../db/schema";
import type { PlayerMarketSessionPrincipal } from "./player-market-types";

const PLAYER_MARKET_SESSION_COOKIE = "hs_player_market_session";
const PLAYER_MARKET_MAGIC_LINK_LIFETIME_MS = 30 * 60 * 1000;
const PLAYER_MARKET_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_COOKIE_PATH = "/";
const RANDOM_TOKEN_BYTES = 32;
const BASE64_PADDING_RE = /=+$/u;

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
  "yahoo.es",
]);

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64_PADDING_RE, "");
}

function createRandomToken(): string {
  return bytesToBase64Url(
    crypto.getRandomValues(new Uint8Array(RANDOM_TOKEN_BYTES))
  );
}

export async function hashPlayerMarketToken(token: string): Promise<string> {
  const input = new TextEncoder().encode(token);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function safePlayerMarketReturnPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const url = new URL(value, "https://hackspain.local");
    if (
      url.origin !== "https://hackspain.local" ||
      !url.pathname.startsWith("/player-market")
    ) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function isCorporateEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  return Boolean(domain && !FREE_EMAIL_DOMAINS.has(domain));
}

interface MagicLinkInput {
  companyId?: string;
  companyName?: string;
  email: string;
  purpose: PlayerMarketMagicLinkPurpose;
  returnPath: string;
  signupId?: string;
}

export async function createPlayerMarketMagicLink(
  input: MagicLinkInput
): Promise<{ expiresAt: Date; rawToken: string }> {
  const rawToken = createRandomToken();
  const tokenHash = await hashPlayerMarketToken(rawToken);
  const expiresAt = new Date(Date.now() + PLAYER_MARKET_MAGIC_LINK_LIFETIME_MS);

  await getDb().insert(playerMarketMagicLinks).values({
    companyId: input.companyId,
    companyName: input.companyName,
    email: input.email,
    expiresAt,
    purpose: input.purpose,
    returnPath: input.returnPath,
    signupId: input.signupId,
    tokenHash,
  });

  return { expiresAt, rawToken };
}

interface ConsumedLink {
  principal: PlayerMarketSessionPrincipal;
  returnPath: string;
  sessionExpiresAt: Date;
  sessionToken: string;
}

export async function consumePlayerMarketMagicLink(
  rawToken: string
): Promise<ConsumedLink | null> {
  const tokenHash = await hashPlayerMarketToken(rawToken);
  const now = new Date();
  const [link] = await getDb()
    .update(playerMarketMagicLinks)
    .set({ consumedAt: now })
    .where(
      and(
        eq(playerMarketMagicLinks.tokenHash, tokenHash),
        isNull(playerMarketMagicLinks.consumedAt),
        gt(playerMarketMagicLinks.expiresAt, now)
      )
    )
    .returning();

  if (!link) {
    return null;
  }

  let principal: PlayerMarketSessionPrincipal;
  if (link.purpose === "player_access" && link.signupId) {
    principal = { companyId: null, signupId: link.signupId, type: "player" };
  } else if (link.purpose === "company_access") {
    const companyName = link.companyName?.trim();
    if (!companyName) {
      return null;
    }
    const [company] = await getDb()
      .insert(playerMarketCompanies)
      .values({ email: link.email, name: companyName, verifiedAt: now })
      .onConflictDoUpdate({
        set: { name: companyName, updatedAt: now, verifiedAt: now },
        target: playerMarketCompanies.email,
      })
      .returning({ id: playerMarketCompanies.id });
    principal = { companyId: company.id, signupId: null, type: "company" };
  } else {
    return null;
  }

  const sessionToken = createRandomToken();
  const sessionExpiresAt = new Date(
    Date.now() + PLAYER_MARKET_SESSION_LIFETIME_MS
  );
  await getDb()
    .insert(playerMarketSessions)
    .values({
      companyId: principal.companyId,
      expiresAt: sessionExpiresAt,
      principalType: principal.type,
      signupId: principal.signupId,
      tokenHash: await hashPlayerMarketToken(sessionToken),
    });

  return {
    principal,
    returnPath: link.returnPath,
    sessionExpiresAt,
    sessionToken,
  };
}

export async function getPlayerMarketPrincipal(
  cookies: AstroCookies
): Promise<PlayerMarketSessionPrincipal | null> {
  const rawToken = cookies.get(PLAYER_MARKET_SESSION_COOKIE)?.value;
  if (!rawToken) {
    return null;
  }
  const now = new Date();
  const [session] = await getDb()
    .select({
      companyId: playerMarketSessions.companyId,
      principalType: playerMarketSessions.principalType,
      signupId: playerMarketSessions.signupId,
    })
    .from(playerMarketSessions)
    .where(
      and(
        eq(
          playerMarketSessions.tokenHash,
          await hashPlayerMarketToken(rawToken)
        ),
        gt(playerMarketSessions.expiresAt, now),
        isNull(playerMarketSessions.revokedAt)
      )
    )
    .limit(1);

  if (session?.principalType === "player" && session.signupId) {
    return { companyId: null, signupId: session.signupId, type: "player" };
  }
  if (session?.principalType === "company" && session.companyId) {
    return { companyId: session.companyId, signupId: null, type: "company" };
  }
  return null;
}

export function setPlayerMarketSessionCookie(
  cookies: AstroCookies,
  token: string,
  expiresAt: Date
): void {
  cookies.set(PLAYER_MARKET_SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    path: SESSION_COOKIE_PATH,
    sameSite: "lax",
    secure: !import.meta.env.DEV,
  });
}

export async function revokePlayerMarketSession(
  cookies: AstroCookies
): Promise<void> {
  const rawToken = cookies.get(PLAYER_MARKET_SESSION_COOKIE)?.value;
  if (rawToken) {
    await getDb()
      .update(playerMarketSessions)
      .set({ revokedAt: new Date() })
      .where(
        eq(
          playerMarketSessions.tokenHash,
          await hashPlayerMarketToken(rawToken)
        )
      );
  }
  cookies.delete(PLAYER_MARKET_SESSION_COOKIE, { path: SESSION_COOKIE_PATH });
}
