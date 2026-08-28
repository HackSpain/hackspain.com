import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { envFromRuntime } from "../lib/runtime-env";
import {
  hackathonPreSignups,
  hackathonSignups,
  playerMarketCompanies,
  playerMarketCompanyInvites,
  playerMarketMagicLinks,
  playerMarketOfferEvents,
  playerMarketOffers,
  playerMarketProfiles,
  playerMarketSessions,
  shortlistReviews,
} from "./schema";

const schema = {
  hackathonPreSignups,
  hackathonSignups,
  playerMarketCompanies,
  playerMarketCompanyInvites,
  playerMarketMagicLinks,
  playerMarketOfferEvents,
  playerMarketOffers,
  playerMarketProfiles,
  playerMarketSessions,
  shortlistReviews,
};

function requireDatabaseUrl(): string {
  const url = envFromRuntime("DATABASE_URL");
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(neon(requireDatabaseUrl()), { schema });
  }
  return _db;
}
