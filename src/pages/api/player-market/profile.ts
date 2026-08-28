import type { APIRoute } from "astro";
import { getPlayerMarketPrincipal } from "../../../lib/player-market-auth";
import {
  hasPlayerMarketSameOrigin,
  playerMarketJson,
  readPlayerMarketJson,
} from "../../../lib/player-market-http";
import { updatePlayerMarketProfile } from "../../../lib/player-market-service";
import { playerMarketProfileUpdateSchema } from "../../../lib/player-market-types";

export const prerender = false;

export const PATCH: APIRoute = async ({ cookies, request }) => {
  if (!hasPlayerMarketSameOrigin(request)) {
    return playerMarketJson({ error: "invalid_origin" }, 403);
  }
  const principal = await getPlayerMarketPrincipal(cookies);
  if (principal?.type !== "player") {
    return playerMarketJson({ error: "unauthorized" }, 401);
  }
  const parsed = playerMarketProfileUpdateSchema.safeParse(
    await readPlayerMarketJson(request)
  );
  if (!parsed.success) {
    return playerMarketJson(
      { error: "invalid_profile", issues: parsed.error.issues },
      400
    );
  }
  const profile = await updatePlayerMarketProfile(principal, parsed.data);
  if (!profile) {
    return playerMarketJson({ error: "profile_not_found" }, 404);
  }
  return playerMarketJson({ ok: true, profile });
};
