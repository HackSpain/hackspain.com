import type { APIRoute } from "astro";
import {
  consumePlayerMarketMagicLink,
  setPlayerMarketSessionCookie,
} from "../../../../lib/player-market-auth";

export const prerender = false;

const INVALID_ACCESS_PATH = "/player-market?access=invalid";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,100}$/u;

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  const token = url.searchParams.get("token") ?? "";
  if (!TOKEN_PATTERN.test(token)) {
    return redirect(INVALID_ACCESS_PATH, 303);
  }
  try {
    const consumed = await consumePlayerMarketMagicLink(token);
    if (!consumed) {
      return redirect(INVALID_ACCESS_PATH, 303);
    }
    setPlayerMarketSessionCookie(
      cookies,
      consumed.sessionToken,
      consumed.sessionExpiresAt
    );
    return redirect(consumed.returnPath, 303);
  } catch {
    return redirect(INVALID_ACCESS_PATH, 303);
  }
};
