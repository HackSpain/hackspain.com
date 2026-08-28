import type { PlayerMarketOfferStatus } from "../db/schema";
import type { PlayerMarketSessionPrincipal } from "./player-market-types";

export type PlayerMarketOfferAction = "accept" | "negotiate" | "reject";

const NEXT_STATUS_BY_ACTION = {
  accept: "accepted",
  negotiate: "negotiating",
  reject: "rejected",
} as const satisfies Record<PlayerMarketOfferAction, PlayerMarketOfferStatus>;

export function nextPlayerMarketOfferStatus(
  current: PlayerMarketOfferStatus,
  action: PlayerMarketOfferAction
): PlayerMarketOfferStatus | null {
  if (current !== "sent" && current !== "negotiating") {
    return null;
  }
  return NEXT_STATUS_BY_ACTION[action];
}

export function playerCanDecideOffer(
  principal: PlayerMarketSessionPrincipal,
  profileSignupId: string
): boolean {
  return principal.type === "player" && principal.signupId === profileSignupId;
}
