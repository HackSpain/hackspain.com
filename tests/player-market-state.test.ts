import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nextPlayerMarketOfferStatus,
  playerCanDecideOffer,
} from "../src/lib/player-market-state.ts";

describe("Player Market offer transitions", () => {
  it("allows a new offer to be accepted, rejected or negotiated", () => {
    assert.equal(nextPlayerMarketOfferStatus("sent", "accept"), "accepted");
    assert.equal(nextPlayerMarketOfferStatus("sent", "reject"), "rejected");
    assert.equal(
      nextPlayerMarketOfferStatus("sent", "negotiate"),
      "negotiating"
    );
  });

  it("allows a negotiating offer to reach another valid decision", () => {
    assert.equal(
      nextPlayerMarketOfferStatus("negotiating", "accept"),
      "accepted"
    );
    assert.equal(
      nextPlayerMarketOfferStatus("negotiating", "reject"),
      "rejected"
    );
  });

  it("keeps terminal and expired offers immutable", () => {
    for (const status of ["accepted", "rejected", "expired"] as const) {
      assert.equal(nextPlayerMarketOfferStatus(status, "accept"), null);
      assert.equal(nextPlayerMarketOfferStatus(status, "negotiate"), null);
      assert.equal(nextPlayerMarketOfferStatus(status, "reject"), null);
    }
  });
});

describe("Player Market offer authorization", () => {
  it("lets only the target player decide an offer", () => {
    const targetPlayer = {
      companyId: null,
      signupId: "player-1",
      type: "player",
    } as const;
    const otherPlayer = {
      companyId: null,
      signupId: "player-2",
      type: "player",
    } as const;
    const company = {
      companyId: "company-1",
      signupId: null,
      type: "company",
    } as const;

    assert.equal(playerCanDecideOffer(targetPlayer, "player-1"), true);
    assert.equal(playerCanDecideOffer(otherPlayer, "player-1"), false);
    assert.equal(playerCanDecideOffer(company, "player-1"), false);
  });
});
