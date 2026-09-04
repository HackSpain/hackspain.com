"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { LoadingText, MetaRow, Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { urlOf } from "@/lib/urls";

export default function HomePage() {
  const me = useQuery(api.users.me);
  const ready = Boolean(
    me &&
      (me.role === "admin" ||
        (me.accepted === true && me.onboardingComplete === true)),
  );
  const signup = useQuery(api.users.mySignup, ready ? {} : "skip");
  const team = useQuery(api.teams.mine, ready ? {} : "skip");
  const claims = useQuery(api.perks.myClaims, ready ? {} : "skip");

  if (!me) return <LoadingText />;

  return (
    <Page
      title={
        <div className="min-w-0">
          <p className="font-bungee text-xs text-hs-brown">HackSpain 2026</p>
          <h1 className="font-bungee text-2xl leading-tight break-words sm:text-3xl">
            Welcome, {me.name ?? "hacker"}
          </h1>
        </div>
      }
    >
      <div className="hs-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>You can change this any time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="gold">{me.attendanceStatus}</Badge>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/profile">Edit RSVP</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              {team ? team.name : "You have not created a team yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="teal" className="w-full sm:w-auto">
              <Link href="/teams">{team ? "Manage team" : "Create a team"}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Perks</CardTitle>
            <CardDescription>
              {claims ? `${claims.length} claimed` : "Loading…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/perks">Browse perks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {signup ? (
        <Card>
          <CardHeader>
            <CardTitle>Your application</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <MetaRow label="Email">{signup.email}</MetaRow>
            <MetaRow label="GitHub">{urlOf(signup.urls, "github") || "—"}</MetaRow>
            <MetaRow label="X">{urlOf(signup.urls, "x") || "—"}</MetaRow>
            <MetaRow label="LinkedIn">{urlOf(signup.urls, "linkedin") || "—"}</MetaRow>
          </CardContent>
        </Card>
      ) : null}
    </Page>
  );
}
