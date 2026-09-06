import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { hackathonSignups } from "../db/schema";
import type { BadgeShareParams } from "./badge-share-params";
import { githubHandleFromUrl } from "./github-handle";

/**
 * Two people can share a name, so a handful of candidates are read and the
 * GitHub handle in the link picks between them.
 */
const CANDIDATE_LIMIT = 5;

/**
 * Confirming a place is what earns the badge, so nothing else gets one. A place
 * given up later stops matching, and the shared link goes quiet with it.
 */
const BADGE_APPROVAL_STATUS = "confirmed";

export interface SharedBadge extends BadgeShareParams {
  /** The photo they put on their badge, when they chose one. */
  photoDataUri: string | null;
  /** Changes whenever the photo does, so caches can be told apart. */
  photoVersion: number | null;
}

/**
 * Resolves a shared link against the signups table, and answers with what the
 * record says rather than what the link claimed. Anyone can put any name in a
 * query string, so nothing reaches the page or the social image until a
 * confirmed attendee actually matches it.
 */
export async function findSharedBadge({
  fullName,
  githubHandle,
}: BadgeShareParams): Promise<SharedBadge | null> {
  if (!fullName) {
    return null;
  }

  const candidates = await getDb()
    .select({
      badgePhoto: hackathonSignups.badgePhoto,
      badgePhotoUpdatedAt: hackathonSignups.badgePhotoUpdatedAt,
      fullName: hackathonSignups.fullName,
      githubUrl: hackathonSignups.githubUrl,
    })
    .from(hackathonSignups)
    .where(
      and(
        eq(hackathonSignups.approvalStatus, BADGE_APPROVAL_STATUS),
        sql`lower(btrim(${hackathonSignups.fullName})) = lower(btrim(${fullName}))`
      )
    )
    .limit(CANDIDATE_LIMIT);

  const matches = candidates.map((candidate) => ({
    fullName: candidate.fullName,
    githubHandle: githubHandleFromUrl(candidate.githubUrl),
    photoDataUri: candidate.badgePhoto,
    photoVersion: candidate.badgePhotoUpdatedAt?.getTime() ?? null,
  }));

  if (githubHandle) {
    return matches.find((match) => match.githubHandle === githubHandle) ?? null;
  }

  // Namesakes with nothing in the link to tell them apart would otherwise be
  // shown whichever record came first, so the badge could belong to the wrong
  // person. Better to show none than someone else's.
  return matches.length === 1 ? matches[0] : null;
}
