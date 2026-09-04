"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SignOutButton } from "@/components/auth-gate";
import { AuthScreen } from "@/components/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  const me = useQuery(api.users.me);

  return (
    <AuthScreen>
      <Card className="hs-enter w-full max-w-lg">
        <CardHeader>
          <p className="font-bungee text-xs text-hs-brown">HackSpain 2026</p>
          <CardTitle className="text-2xl sm:text-3xl">Not accepted yet</CardTitle>
          <CardDescription>
            We have an application for {me?.email ?? "this email"}, but you are
            not on the accepted list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-hs-brown">
          <p>
            Organizers mark accepted hackers in the dashboard. Once you are
            accepted, you can sign in again and confirm your details.
          </p>
          <SignOutButton className="w-full sm:w-auto" />
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
