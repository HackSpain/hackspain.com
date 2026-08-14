export type ShortlistDecision = "maybe" | "no" | "yes";

export interface ShortlistParticipant {
  achievements: string | null;
  aiEvidenceSources: string[];
  aiNote: string | null;
  aiRecommendation: ShortlistDecision | null;
  aiReviewedAt: string | null;
  aiRubricVersion: string | null;
  aiScore: number | null;
  ambassadorMotivation: string | null;
  createdAt: string;
  decision: ShortlistDecision | null;
  email: string;
  employer: string | null;
  freeTime: string | null;
  fullName: string;
  githubUrl: string | null;
  heardFrom: string[];
  id: string;
  importedAt: string | null;
  linkedinUrl: string | null;
  notes: string;
  occupationStatuses: string[];
  referralCode: string | null;
  score: number | null;
  sourceNotes: string | null;
  studyInstitution: string | null;
  updatedAt: string | null;
  wantsAmbassador: boolean;
  webUrl: string | null;
  xUrl: string | null;
}

export interface ShortlistResponse {
  participants: ShortlistParticipant[];
}

export interface ShortlistImportResponse {
  imported: number;
  matched: number;
  unmatched: number;
}
