"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Field, LoadingText, Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Frame } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { urlLabel } from "@/lib/urls";

export default function AdminTracksPage() {
  const tracks = useQuery(api.tracks.adminList);
  const settings = useQuery(api.tracks.adminSettings);
  const submissions = useQuery(api.submissions.adminList);
  const ensureDefaults = useMutation(api.tracks.adminEnsureDefaults);
  const update = useMutation(api.tracks.adminUpdate);
  const setOpen = useMutation(api.tracks.adminSetSubmissionsOpen);
  const [drafts, setDrafts] = useState<
    Record<string, { label: string; body: string; note: string }>
  >({});

  useEffect(() => {
    if (tracks !== undefined && tracks.length === 0) {
      void ensureDefaults({});
    }
  }, [tracks, ensureDefaults]);

  if (!tracks || !settings || submissions === undefined) return <LoadingText />;

  return (
    <Page
      title="Tracks & submissions"
      description="Challenges live in Convex. One project can appear under every selected challenge."
    >
      <Card>
        <CardHeader>
          <CardTitle>Submission window</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Badge variant={settings.submissionsOpen ? "gold" : "default"}>
            {settings.submissionsOpen ? "Open" : "Closed"}
          </Badge>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() =>
              void setOpen({ submissionsOpen: !settings.submissionsOpen })
            }
          >
            {settings.submissionsOpen ? "Close submissions" : "Open submissions"}
          </Button>
        </CardContent>
      </Card>

      {tracks.map((track) => {
        const draft = drafts[track._id] ?? {
          label: track.label,
          body: track.body,
          note: track.note,
        };
        const under = submissions.filter((row) =>
          row.challengeIds.includes(track._id),
        );
        return (
          <Card key={track._id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {track.label}
                <Badge>{track.active ? "Active" : "Hidden"}</Badge>
                <Badge variant="gold">{under.length} projects</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Label">
                  <Input
                    value={draft.label}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [track._id]: { ...draft, label: event.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Note">
                  <Input
                    value={draft.note}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [track._id]: { ...draft, note: event.target.value },
                      }))
                    }
                  />
                </Field>
              </div>
              <Field label="Body">
                <Textarea
                  value={draft.body}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [track._id]: { ...draft, body: event.target.value },
                    }))
                  }
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void update({
                      trackId: track._id as Id<"tracks">,
                      label: draft.label,
                      body: draft.body,
                      note: draft.note,
                    })
                  }
                >
                  Save copy
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void update({
                      trackId: track._id as Id<"tracks">,
                      active: !track.active,
                    })
                  }
                >
                  {track.active ? "Hide" : "Show"}
                </Button>
              </div>
              {under.length === 0 ? (
                <p className="text-sm text-hs-brown">No projects in this challenge yet.</p>
              ) : (
                <div className="space-y-3">
                  {under.map((row) => (
                    <Frame key={row._id} tone="navy">
                      <p className="font-bungee text-sm">
                        {row.name || "Untitled"}{" "}
                        <Badge>{row.status}</Badge>
                      </p>
                      <p className="text-hs-brown">
                        {row.teamName ?? "Solo"} ·{" "}
                        {row.challenges.map((c) => c.label).join(", ")}
                      </p>
                      {row.perks.length > 0 ? (
                        <p>
                          Used:{" "}
                          {row.perks
                            .map((perk) => `${perk.company} · ${perk.title}`)
                            .join(", ")}
                        </p>
                      ) : null}
                      {row.urls.map((entry) => (
                        <p key={entry.kind}>
                          {urlLabel(entry.kind)}: {entry.url}
                        </p>
                      ))}
                    </Frame>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Page>
  );
}
