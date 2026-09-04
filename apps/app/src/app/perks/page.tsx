"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { EmptyState, FormError, LoadingText, Page, errorMessage } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Frame } from "@/components/ui/card";

export default function PerksPage() {
  const catalog = useQuery(api.perks.listCatalog);
  const claim = useMutation(api.perks.claim);
  const [error, setError] = useState<string | null>(null);

  if (catalog === undefined) return <LoadingText />;

  return (
    <Page
      title="Perks"
      description="Claim partner benefits. Email perks become applications. Code perks assign you a unique code."
    >
      <FormError message={error} />
      {catalog.length === 0 ? (
        <EmptyState title="No perks yet">
          Partner benefits will show up here when organizers publish them.
        </EmptyState>
      ) : (
        <div className="hs-stagger grid gap-4 sm:grid-cols-2">
          {catalog.map(({ perk, claim: existing }) => (
            <Card key={perk._id}>
              <CardHeader>
                <CardTitle>{perk.title}</CardTitle>
                <CardDescription>
                  {perk.company} · {perk.value}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{perk.description}</p>
                <Badge>{perk.type === "code" ? "Code grant" : "Email application"}</Badge>
                {existing ? (
                  <Frame tone="navy">
                    <p className="font-bungee text-xs uppercase">{existing.status}</p>
                    {existing.code ? (
                      <p className="mt-1 break-all font-mono text-base">{existing.code}</p>
                    ) : (
                      <p>Your application is with the organizers.</p>
                    )}
                  </Frame>
                ) : (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setError(null);
                      void claim({ perkId: perk._id }).catch((err: unknown) =>
                        setError(errorMessage(err, "Could not claim")),
                      );
                    }}
                  >
                    Claim
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
