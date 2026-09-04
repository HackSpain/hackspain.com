"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SignOutButton } from "@/components/auth-gate";
import { AuthScreen } from "@/components/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnregisteredPage() {
  const me = useQuery(api.users.me);

  return (
    <AuthScreen>
      <Card className="hs-enter w-full max-w-lg">
        <CardHeader>
          <p className="font-bungee text-xs text-hs-brown">HackSpain 2026</p>
          <CardTitle className="text-2xl sm:text-3xl">No signup found</CardTitle>
          <CardDescription>
            We do not have a HackSpain application for {me?.email ?? "this email"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-hs-brown">
          <p>
            Log in with the same email you used on hackspain.com/signup. This
            dashboard is only for people who already applied. If your application
            is missing, ask an organizer to import it.
          </p>
          <SignOutButton className="w-full sm:w-auto" />
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
