import type { APIRoute } from "astro";
import { getPlayerMarketPrincipal } from "../../../lib/player-market-auth";
import {
  hasPlayerMarketSameOrigin,
  playerMarketJson,
  readPlayerMarketJson,
} from "../../../lib/player-market-http";
import { createPlayerMarketOffer } from "../../../lib/player-market-service";
import { playerMarketOfferCreateSchema } from "../../../lib/player-market-types";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!hasPlayerMarketSameOrigin(request)) {
    return playerMarketJson({ error: "invalid_origin" }, 403);
  }
  const principal = await getPlayerMarketPrincipal(cookies);
  if (principal?.type !== "company") {
    return playerMarketJson({ error: "company_access_required" }, 401);
  }
  const parsed = playerMarketOfferCreateSchema.safeParse(
    await readPlayerMarketJson(request)
  );
  if (!parsed.success) {
    return playerMarketJson(
      { error: "invalid_offer", issues: parsed.error.issues },
      400
    );
  }
  const offer = await createPlayerMarketOffer(principal, parsed.data);
  if (!offer) {
    return playerMarketJson({ error: "profile_not_available" }, 404);
  }
  return playerMarketJson({ offer, ok: true }, 201);
};
