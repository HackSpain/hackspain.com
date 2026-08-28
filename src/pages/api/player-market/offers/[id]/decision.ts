import type { APIRoute } from "astro";
import { getPlayerMarketPrincipal } from "../../../../../lib/player-market-auth";
import {
  hasPlayerMarketSameOrigin,
  playerMarketJson,
  readPlayerMarketJson,
} from "../../../../../lib/player-market-http";
import { decidePlayerMarketOffer } from "../../../../../lib/player-market-service";
import { playerMarketOfferDecisionSchema } from "../../../../../lib/player-market-types";

export const prerender = false;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const POST: APIRoute = async ({ cookies, params, request }) => {
  if (!hasPlayerMarketSameOrigin(request)) {
    return playerMarketJson({ error: "invalid_origin" }, 403);
  }
  const principal = await getPlayerMarketPrincipal(cookies);
  if (principal?.type !== "player") {
    return playerMarketJson({ error: "player_access_required" }, 401);
  }
  const offerId = params.id ?? "";
  if (!UUID_PATTERN.test(offerId)) {
    return playerMarketJson({ error: "invalid_offer_id" }, 400);
  }
  const parsed = playerMarketOfferDecisionSchema.safeParse(
    await readPlayerMarketJson(request)
  );
  if (!parsed.success) {
    return playerMarketJson(
      { error: "invalid_decision", issues: parsed.error.issues },
      400
    );
  }
  const offer = await decidePlayerMarketOffer(principal, offerId, parsed.data);
  if (!offer) {
    return playerMarketJson({ error: "offer_not_found" }, 404);
  }
  return playerMarketJson({ offer, ok: true });
};
