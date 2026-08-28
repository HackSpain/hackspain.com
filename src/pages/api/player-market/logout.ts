import type { APIRoute } from "astro";
import { revokePlayerMarketSession } from "../../../lib/player-market-auth";
import {
  hasPlayerMarketSameOrigin,
  playerMarketJson,
} from "../../../lib/player-market-http";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!hasPlayerMarketSameOrigin(request)) {
    return playerMarketJson({ error: "invalid_origin" }, 403);
  }
  await revokePlayerMarketSession(cookies);
  return playerMarketJson({ ok: true });
};
