"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { EmptyState, LoadingText, MetaRow, Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Frame } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { urlLabel, urlOf } from "@/lib/urls";

export default function AdminParticipantPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const kind = search.get("kind") === "user" ? "user" : "signup";
  const detail = useQuery(api.admin.getParticipant, {
    signupId: kind === "signup" ? (params.id as Id<"signups">) : undefined,
    userId: kind === "user" ? (params.id as Id<"users">) : undefined,
  });
  const setRole = useMutation(api.admin.setRole);
  const setAttendance = useMutation(api.admin.setAttendance);
  const setAccepted = useMutation(api.admin.setAccepted);
  const setNotes = useMutation(api.admin.setNotes);
  const [notes, setNotesValue] = useState<string | null>(null);

  if (detail === undefined) return <LoadingText />;
  if (detail === null) {
    return (
      <Page title="Participant">
        <EmptyState title="Participant not found">
          This signup or user is missing.{" "}
          <Link href="/admin" className="underline underline-offset-2">
            Back to CRM
          </Link>
        </EmptyState>
      </Page>
    );
  }

  const noteValue = notes ?? detail.user?.adminNotes ?? "";

  return (
    <Page
      title={
        <div className="min-w-0 space-y-2">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center font-bungee text-xs uppercase text-hs-navy motion-safe:transition-transform motion-safe:duration-[var(--duration-press)] motion-safe:ease-[var(--ease-out)] motion-safe:active:scale-[0.97]"
          >
            Back to CRM
          </Link>
          <h1 className="font-bungee text-2xl leading-tight break-words sm:text-3xl">
            {detail.user?.name ?? detail.signup?.fullName ?? "Participant"}
          </h1>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <MetaRow label="Email">{detail.signup?.email ?? detail.user?.email}</MetaRow>
            <MetaRow label="GitHub">{urlOf(detail.signup?.urls, "github") ?? "—"}</MetaRow>
            <MetaRow label="X">{urlOf(detail.signup?.urls, "x") ?? "—"}</MetaRow>
            <MetaRow label="LinkedIn">{urlOf(detail.signup?.urls, "linkedin") ?? "—"}</MetaRow>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={detail.signup?.accepted ? "gold" : "default"}>
                {detail.signup?.accepted ? "accepted" : "not accepted"}
              </Badge>
              {detail.user?.attendanceStatus ? (
                <Badge>{detail.user.attendanceStatus}</Badge>
              ) : null}
            </div>
            <MetaRow label="Phone">{detail.user?.phone ?? "—"}</MetaRow>
            <MetaRow label="Diet">{detail.user?.dietaryRestrictions ?? "—"}</MetaRow>
            {detail.user?.dietaryDetails ? (
              <MetaRow label="Dietary details">{detail.user.dietaryDetails}</MetaRow>
            ) : null}
            <MetaRow label="Travels from">{detail.user?.travelOrigin ?? "—"}</MetaRow>
            {detail.signup?.achievements ? (
              <MetaRow label="Achievements">{detail.signup.achievements}</MetaRow>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admin actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.signup ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void setAccepted({ signupId: detail.signup!._id, accepted: true })
                  }
                >
                  Mark accepted
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void setAccepted({ signupId: detail.signup!._id, accepted: false })
                  }
                >
                  Mark not accepted
                </Button>
              </div>
            ) : (
              <p className="text-sm text-hs-brown">No signup on file, so acceptance cannot be set.</p>
            )}
            {detail.user ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void setRole({ userId: detail.user!._id, role: "admin" })}
                  >
                    Make admin
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void setRole({ userId: detail.user!._id, role: "user" })}
                  >
                    Make user
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() =>
                      void setAttendance({
                        userId: detail.user!._id,
                        attendanceStatus: "attending",
                      })
                    }
                  >
                    Mark attending
                  </Button>
                  <Button
                    variant="teal"
                    className="w-full sm:w-auto"
                    onClick={() =>
                      void setAttendance({
                        userId: detail.user!._id,
                        attendanceStatus: "cancelled",
                      })
                    }
                  >
                    Mark cancelled
                  </Button>
                </div>
                <Textarea
                  value={noteValue}
                  onChange={(event) => setNotesValue(event.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void setNotes({ userId: detail.user!._id, notes: noteValue })
                  }
                >
                  Save notes
                </Button>
              </>
            ) : (
              <p className="text-sm text-hs-brown">This person has not logged in yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Team & perks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Team: {detail.team?.name ?? "—"}</p>
          {detail.claims.length === 0 ? (
            <p>No perk claims.</p>
          ) : (
            detail.claims.map((claim) => (
              <Frame key={claim._id} className="flex flex-wrap items-center gap-2">
                <span>
                  {claim.company} · {claim.title}
                </span>
                <Badge>{claim.status}</Badge>
                {claim.code ? <code className="break-all">{claim.code}</code> : null}
              </Frame>
            ))
          )}
        </CardContent>
      </Card>
      {detail.submission ? (
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-bungee text-base">{detail.submission.name || "Untitled"}</p>
            <Badge>{detail.submission.status}</Badge>
            {detail.submission.description ? <p>{detail.submission.description}</p> : null}
            <p>
              Challenges:{" "}
              {detail.submission.challengeLabels.length > 0
                ? detail.submission.challengeLabels.join(", ")
                : "—"}
            </p>
            <p>
              Partner tools:{" "}
              {detail.submission.perkLabels.length > 0
                ? detail.submission.perkLabels.join(", ")
                : "—"}
            </p>
            {detail.submission.urls.map((entry) => (
              <p key={entry.kind}>
                {urlLabel(entry.kind)}: {entry.url}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </Page>
  );
}
