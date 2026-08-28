import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import type {
  PlayerMarketOfferEventType,
  PlayerMarketOfferStatus,
  PlayerMarketProfileStatus,
} from "../db/schema";
import {
  hackathonSignups,
  playerMarketCompanies,
  playerMarketCompanyInvites,
  playerMarketOfferEvents,
  playerMarketOffers,
  playerMarketProfiles,
} from "../db/schema";
import { badgeInitials } from "./badge-name";
import {
  createPlayerMarketMagicLink,
  hashPlayerMarketToken,
  isCorporateEmail,
  safePlayerMarketReturnPath,
} from "./player-market-auth";
import { sendPlayerMarketAccessEmail } from "./player-market-email";
import {
  nextPlayerMarketOfferStatus,
  playerCanDecideOffer,
} from "./player-market-state";
import type {
  PlayerMarketOfferCreate,
  PlayerMarketOfferDecision,
  PlayerMarketProfileUpdate,
  PlayerMarketSessionPrincipal,
  PublicPlayerMarketProfile,
  PublicPlayerMarketTransfer,
} from "./player-market-types";

const ACTIVE_OFFER_STATUSES: PlayerMarketOfferStatus[] = [
  "negotiating",
  "sent",
];
const CONFIRMED_SIGNUP_STATUS = "confirmed";
const OFFER_LIFETIME_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PLAYER_MARKET_PATH = "/player-market";
const PLAYER_MARKET_MANAGE_PATH = "/player-market/manage";
const SLUG_UNSAFE_CHARACTERS_RE = /[^a-z0-9]+/gu;
const SLUG_TRIM_RE = /^-+|-+$/gu;
const WHITESPACE_RE = /\s+/u;

export interface PlayerMarketAccessResult {
  debugUrl?: string;
  delivered: boolean;
}

export interface PlayerMarketCompanySummary {
  email: string;
  id: string;
  name: string;
}

export interface PlayerMarketPrivateOffer {
  companyName: string;
  createdAt: string;
  deliverables: string;
  id: string;
  message: string | null;
  rewardSummary: string;
  rewardTypes: string[];
  sponsorshipType: string;
  status: PlayerMarketOfferStatus;
}

export interface PlayerMarketPrivateProfile {
  bio: string;
  city: string;
  displayName: string;
  email: string;
  isAvailable: boolean;
  lore: string;
  photo: string | null;
  role: string;
  skills: string[];
  slug: string;
  sponsorshipTypes: string[];
  status: PlayerMarketProfileStatus;
}

interface PlayerMarketOfferResult {
  id: string;
  status: PlayerMarketOfferStatus;
}

function slugifyName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLowerCase()
      .replace(SLUG_UNSAFE_CHARACTERS_RE, "-")
      .replace(SLUG_TRIM_RE, "") || "builder"
  );
}

function profileSlug(fullName: string, signupId: string): string {
  return `${slugifyName(fullName)}-${signupId.slice(0, 8)}`;
}

function playerMarketAccessUrl(origin: string, token: string): string {
  const url = new URL("/api/player-market/access/exchange", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

function offerExpiry(): Date {
  return new Date(Date.now() + OFFER_LIFETIME_DAYS * MILLISECONDS_PER_DAY);
}

async function findConfirmedSignupByEmail(email: string) {
  const [signup] = await getDb()
    .select({
      badgePhoto: hackathonSignups.badgePhoto,
      email: hackathonSignups.email,
      fullName: hackathonSignups.fullName,
      id: hackathonSignups.id,
    })
    .from(hackathonSignups)
    .where(
      and(
        eq(hackathonSignups.email, email),
        eq(hackathonSignups.approvalStatus, CONFIRMED_SIGNUP_STATUS)
      )
    )
    .limit(1);
  return signup ?? null;
}

async function getOrCreatePlayerMarketProfile(signupId: string) {
  const [signup] = await getDb()
    .select({
      badgePhoto: hackathonSignups.badgePhoto,
      email: hackathonSignups.email,
      fullName: hackathonSignups.fullName,
      id: hackathonSignups.id,
    })
    .from(hackathonSignups)
    .where(
      and(
        eq(hackathonSignups.id, signupId),
        eq(hackathonSignups.approvalStatus, CONFIRMED_SIGNUP_STATUS)
      )
    )
    .limit(1);

  if (!signup) {
    return null;
  }

  await getDb()
    .insert(playerMarketProfiles)
    .values({
      displayName: signup.fullName,
      slug: profileSlug(signup.fullName, signup.id),
      sponsorshipTypes: ["equipped", "built_with", "team_sponsor"],
      signupId: signup.id,
    })
    .onConflictDoNothing({ target: playerMarketProfiles.signupId });

  const [profile] = await getDb()
    .select()
    .from(playerMarketProfiles)
    .where(eq(playerMarketProfiles.signupId, signup.id))
    .limit(1);

  if (!profile) {
    return null;
  }
  return { profile, signup };
}

export async function requestPlayerMarketPlayerAccess(
  email: string,
  origin: string,
  returnTo?: string
): Promise<PlayerMarketAccessResult> {
  const signup = await findConfirmedSignupByEmail(email);
  if (!signup) {
    return { delivered: false };
  }
  await getOrCreatePlayerMarketProfile(signup.id);
  const { expiresAt, rawToken } = await createPlayerMarketMagicLink({
    email: signup.email,
    purpose: "player_access",
    returnPath: safePlayerMarketReturnPath(returnTo, PLAYER_MARKET_MANAGE_PATH),
    signupId: signup.id,
  });
  const link = playerMarketAccessUrl(origin, rawToken);
  const emailResult = await sendPlayerMarketAccessEmail({
    email: signup.email,
    expiresAt,
    link,
    name: signup.fullName.split(WHITESPACE_RE)[0] ?? "builder",
    purpose: "player",
    reference: `${signup.id}-${expiresAt.getTime()}`,
  });
  return {
    debugUrl: import.meta.env.DEV ? link : undefined,
    delivered: emailResult.ok,
  };
}

async function consumeCompanyInvite(
  email: string,
  rawToken: string | undefined
): Promise<boolean> {
  if (!rawToken) {
    return false;
  }
  const now = new Date();
  const [invite] = await getDb()
    .update(playerMarketCompanyInvites)
    .set({ consumedAt: now })
    .where(
      and(
        eq(playerMarketCompanyInvites.email, email),
        eq(
          playerMarketCompanyInvites.tokenHash,
          await hashPlayerMarketToken(rawToken)
        ),
        isNull(playerMarketCompanyInvites.consumedAt),
        gt(playerMarketCompanyInvites.expiresAt, now)
      )
    )
    .returning({ id: playerMarketCompanyInvites.id });
  return Boolean(invite);
}

export async function requestPlayerMarketCompanyAccess(
  input: {
    companyName: string;
    email: string;
    inviteToken?: string;
    returnTo?: string;
  },
  origin: string
): Promise<PlayerMarketAccessResult> {
  const hasInvite = await consumeCompanyInvite(input.email, input.inviteToken);
  if (!(hasInvite || isCorporateEmail(input.email))) {
    return { delivered: false };
  }
  const { expiresAt, rawToken } = await createPlayerMarketMagicLink({
    companyName: input.companyName,
    email: input.email,
    purpose: "company_access",
    returnPath: safePlayerMarketReturnPath(input.returnTo, PLAYER_MARKET_PATH),
  });
  const link = playerMarketAccessUrl(origin, rawToken);
  const emailResult = await sendPlayerMarketAccessEmail({
    email: input.email,
    expiresAt,
    link,
    name: input.companyName,
    purpose: "company",
    reference: `${await hashPlayerMarketToken(input.email)}-${expiresAt.getTime()}`,
  });
  return {
    debugUrl: import.meta.env.DEV ? link : undefined,
    delivered: emailResult.ok,
  };
}

export async function listPublicPlayerMarketProfiles(): Promise<
  PublicPlayerMarketProfile[]
> {
  const rows = await getDb()
    .select({
      bio: playerMarketProfiles.bio,
      city: playerMarketProfiles.city,
      displayName: playerMarketProfiles.displayName,
      isAvailable: playerMarketProfiles.isAvailable,
      lore: playerMarketProfiles.lore,
      photo: hackathonSignups.badgePhoto,
      role: playerMarketProfiles.role,
      skills: playerMarketProfiles.skills,
      slug: playerMarketProfiles.slug,
      sponsorshipTypes: playerMarketProfiles.sponsorshipTypes,
    })
    .from(playerMarketProfiles)
    .innerJoin(
      hackathonSignups,
      eq(playerMarketProfiles.signupId, hackathonSignups.id)
    )
    .where(eq(playerMarketProfiles.status, "published"))
    .orderBy(desc(playerMarketProfiles.publishedAt));

  return rows.map((row) => ({
    ...row,
    bio: row.bio,
    city: row.city ?? "Madrid",
    initials: badgeInitials(row.displayName),
    lore: row.lore ?? "Builder verificado por HackSpain.",
    role: row.role ?? "Builder",
  }));
}

export async function listPublicPlayerMarketTransfers(): Promise<
  PublicPlayerMarketTransfer[]
> {
  const rows = await getDb()
    .select({
      acceptedAt: playerMarketOffers.decidedAt,
      companyName: playerMarketCompanies.name,
      id: playerMarketOffers.id,
      playerName: playerMarketProfiles.displayName,
      rewardSummary: playerMarketOffers.rewardSummary,
      sponsorshipType: playerMarketOffers.sponsorshipType,
    })
    .from(playerMarketOffers)
    .innerJoin(
      playerMarketProfiles,
      eq(playerMarketOffers.profileSignupId, playerMarketProfiles.signupId)
    )
    .innerJoin(
      playerMarketCompanies,
      eq(playerMarketOffers.companyId, playerMarketCompanies.id)
    )
    .where(eq(playerMarketOffers.status, "accepted"))
    .orderBy(desc(playerMarketOffers.decidedAt));

  return rows.map((row) => ({
    ...row,
    acceptedAt: (row.acceptedAt ?? new Date()).toISOString(),
  }));
}

export async function getPlayerMarketPrivateProfile(
  signupId: string
): Promise<PlayerMarketPrivateProfile | null> {
  const record = await getOrCreatePlayerMarketProfile(signupId);
  if (!record) {
    return null;
  }
  const { profile, signup } = record;
  return {
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    displayName: profile.displayName,
    email: signup.email,
    isAvailable: profile.isAvailable,
    lore: profile.lore ?? "",
    photo: signup.badgePhoto,
    role: profile.role ?? "",
    skills: profile.skills,
    slug: profile.slug,
    sponsorshipTypes: profile.sponsorshipTypes,
    status: profile.status,
  };
}

export async function listPlayerMarketOffersForPlayer(
  signupId: string
): Promise<PlayerMarketPrivateOffer[]> {
  const rows = await getDb()
    .select({
      companyName: playerMarketCompanies.name,
      createdAt: playerMarketOffers.createdAt,
      deliverables: playerMarketOffers.deliverables,
      id: playerMarketOffers.id,
      message: playerMarketOffers.message,
      rewardSummary: playerMarketOffers.rewardSummary,
      rewardTypes: playerMarketOffers.rewardTypes,
      sponsorshipType: playerMarketOffers.sponsorshipType,
      status: playerMarketOffers.status,
    })
    .from(playerMarketOffers)
    .innerJoin(
      playerMarketCompanies,
      eq(playerMarketOffers.companyId, playerMarketCompanies.id)
    )
    .where(eq(playerMarketOffers.profileSignupId, signupId))
    .orderBy(desc(playerMarketOffers.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function updatePlayerMarketProfile(
  principal: PlayerMarketSessionPrincipal,
  input: PlayerMarketProfileUpdate
): Promise<PlayerMarketPrivateProfile | null> {
  if (principal.type !== "player") {
    return null;
  }
  const existing = await getOrCreatePlayerMarketProfile(principal.signupId);
  if (!existing) {
    return null;
  }
  const now = new Date();
  let status: PlayerMarketProfileStatus = "hidden";
  if (input.publish) {
    status = "published";
  } else if (existing.profile.status === "draft") {
    status = "draft";
  }
  await getDb()
    .update(playerMarketProfiles)
    .set({
      bio: input.bio || null,
      city: input.city,
      consentedAt: input.publish
        ? (existing.profile.consentedAt ?? now)
        : existing.profile.consentedAt,
      displayName: input.displayName,
      isAvailable: input.isAvailable,
      lore: input.lore,
      publishedAt: input.publish
        ? (existing.profile.publishedAt ?? now)
        : existing.profile.publishedAt,
      role: input.role,
      skills: input.skills,
      sponsorshipTypes: input.sponsorshipTypes,
      status,
      updatedAt: now,
    })
    .where(eq(playerMarketProfiles.signupId, principal.signupId));
  return getPlayerMarketPrivateProfile(principal.signupId);
}

export async function getPlayerMarketCompany(
  companyId: string
): Promise<PlayerMarketCompanySummary | null> {
  const [company] = await getDb()
    .select({
      email: playerMarketCompanies.email,
      id: playerMarketCompanies.id,
      name: playerMarketCompanies.name,
    })
    .from(playerMarketCompanies)
    .where(eq(playerMarketCompanies.id, companyId))
    .limit(1);
  return company ?? null;
}

export async function createPlayerMarketOffer(
  principal: PlayerMarketSessionPrincipal,
  input: PlayerMarketOfferCreate
): Promise<PlayerMarketOfferResult | null> {
  if (principal.type !== "company") {
    return null;
  }
  const [profile] = await getDb()
    .select({ signupId: playerMarketProfiles.signupId })
    .from(playerMarketProfiles)
    .where(
      and(
        eq(playerMarketProfiles.slug, input.profileSlug),
        eq(playerMarketProfiles.status, "published"),
        eq(playerMarketProfiles.isAvailable, true)
      )
    )
    .limit(1);
  if (!profile) {
    return null;
  }
  const [offer] = await getDb()
    .insert(playerMarketOffers)
    .values({
      companyId: principal.companyId,
      deliverables: input.deliverables,
      expiresAt: offerExpiry(),
      message: input.message,
      profileSignupId: profile.signupId,
      rewardSummary: input.rewardSummary,
      rewardTypes: input.rewardTypes,
      sponsorshipType: input.sponsorshipType,
      status: "sent",
    })
    .returning({
      id: playerMarketOffers.id,
      status: playerMarketOffers.status,
    });
  await getDb()
    .insert(playerMarketOfferEvents)
    .values([
      { actorType: "company", eventType: "created", offerId: offer.id },
      { actorType: "company", eventType: "sent", offerId: offer.id },
    ]);
  return offer;
}

export async function decidePlayerMarketOffer(
  principal: PlayerMarketSessionPrincipal,
  offerId: string,
  input: PlayerMarketOfferDecision
): Promise<PlayerMarketOfferResult | null> {
  if (principal.type !== "player") {
    return null;
  }
  const [current] = await getDb()
    .select({
      profileSignupId: playerMarketOffers.profileSignupId,
      status: playerMarketOffers.status,
    })
    .from(playerMarketOffers)
    .where(eq(playerMarketOffers.id, offerId))
    .limit(1);
  if (!(current && playerCanDecideOffer(principal, current.profileSignupId))) {
    return null;
  }
  const nextStatus = nextPlayerMarketOfferStatus(current.status, input.action);
  if (!nextStatus) {
    return { id: offerId, status: current.status };
  }
  const now = new Date();
  const [updated] = await getDb()
    .update(playerMarketOffers)
    .set({
      decidedAt:
        nextStatus === "accepted" || nextStatus === "rejected" ? now : null,
      deliverables: input.deliverables || undefined,
      rewardSummary: input.rewardSummary || undefined,
      status: nextStatus,
      updatedAt: now,
    })
    .where(
      and(
        eq(playerMarketOffers.id, offerId),
        inArray(playerMarketOffers.status, ACTIVE_OFFER_STATUSES)
      )
    )
    .returning({
      id: playerMarketOffers.id,
      status: playerMarketOffers.status,
    });
  if (!updated) {
    return null;
  }
  await getDb()
    .insert(playerMarketOfferEvents)
    .values({
      actorType: "player",
      details: input.note ? { note: input.note } : undefined,
      eventType: nextStatus satisfies PlayerMarketOfferEventType,
      offerId: updated.id,
    });
  return updated;
}
