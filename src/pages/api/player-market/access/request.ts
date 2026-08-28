import type { APIRoute } from "astro";
import {
  hasPlayerMarketSameOrigin,
  playerMarketJson,
  readPlayerMarketJson,
} from "../../../../lib/player-market-http";
import {
  requestPlayerMarketCompanyAccess,
  requestPlayerMarketPlayerAccess,
} from "../../../../lib/player-market-service";
import { playerMarketAccessRequestSchema } from "../../../../lib/player-market-types";

export const prerender = false;

const GENERIC_ACCESS_RESPONSE = {
  message: "Si los datos son válidos, recibirás un enlace en tu correo.",
  ok: true,
} as const;

export const POST: APIRoute = async ({ request, url }) => {
  if (!hasPlayerMarketSameOrigin(request)) {
    return playerMarketJson({ error: "invalid_origin" }, 403);
  }
  const body = await readPlayerMarketJson(request);
  const parsed = playerMarketAccessRequestSchema.safeParse(body);
  if (!parsed.success) {
    return playerMarketJson({ error: "invalid_request" }, 400);
  }

  try {
    const result =
      parsed.data.audience === "player"
        ? await requestPlayerMarketPlayerAccess(
            parsed.data.email,
            url.origin,
            parsed.data.returnTo
          )
        : await requestPlayerMarketCompanyAccess(parsed.data, url.origin);
    return playerMarketJson({
      ...GENERIC_ACCESS_RESPONSE,
      ...(result.debugUrl ? { debugUrl: result.debugUrl } : {}),
    });
  } catch {
    return playerMarketJson(GENERIC_ACCESS_RESPONSE);
  }
};
