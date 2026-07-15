import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  ambassadorApplications,
  hackathonPreSignups,
  hackathonSignups,
} from "./schema";

const schema = {
  ambassadorApplications,
  hackathonPreSignups,
  hackathonSignups,
};

function requireDatabaseUrl(): string {
  const url = import.meta.env.DATABASE_URL;
  if (!url || typeof url !== "string") {
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
