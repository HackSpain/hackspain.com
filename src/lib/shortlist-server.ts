import { asc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { hackathonSignups, shortlistReviews } from "../db/schema";
import type { ShortlistParticipant } from "./shortlist-types";

export const listPendingShortlistParticipants = async (): Promise<
  ShortlistParticipant[]
> => {
  const db = getDb();
  const rows = await db
    .select({
      achievements: hackathonSignups.achievements,
      aiEvidenceSources: shortlistReviews.aiEvidenceSources,
      aiNote: shortlistReviews.aiNote,
      aiRecommendation: shortlistReviews.aiRecommendation,
      aiReviewedAt: shortlistReviews.aiReviewedAt,
      aiRubricVersion: shortlistReviews.aiRubricVersion,
      aiScore: shortlistReviews.aiScore,
      ambassadorMotivation: hackathonSignups.ambassadorMotivation,
      createdAt: hackathonSignups.createdAt,
      decision: shortlistReviews.decision,
      email: hackathonSignups.email,
      employer: hackathonSignups.employer,
      freeTime: hackathonSignups.freeTime,
      fullName: hackathonSignups.fullName,
      githubUrl: hackathonSignups.githubUrl,
      heardFrom: hackathonSignups.heardFrom,
      id: hackathonSignups.id,
      importedAt: shortlistReviews.sourceImportedAt,
      linkedinUrl: hackathonSignups.linkedinUrl,
      notes: shortlistReviews.notes,
      occupationStatuses: hackathonSignups.occupationStatuses,
      referralCode: hackathonSignups.referralCode,
      score: shortlistReviews.score,
      sourceNotes: shortlistReviews.sourceNotes,
      studyInstitution: hackathonSignups.studyInstitution,
      updatedAt: shortlistReviews.updatedAt,
      wantsAmbassador: hackathonSignups.wantsAmbassador,
      webUrl: hackathonSignups.webUrl,
      xUrl: hackathonSignups.xUrl,
    })
    .from(hackathonSignups)
    .leftJoin(
      shortlistReviews,
      eq(shortlistReviews.signupId, hackathonSignups.id)
    )
    .where(eq(hackathonSignups.approvalStatus, "pending"))
    .orderBy(asc(hackathonSignups.fullName));

  return rows.map((row) => ({
    ...row,
    aiEvidenceSources: row.aiEvidenceSources ?? [],
    aiReviewedAt: row.aiReviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    importedAt: row.importedAt?.toISOString() ?? null,
    notes: row.notes ?? row.sourceNotes ?? "",
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }));
};
