"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Field, FormError, FormNotice, LoadingText, Page, errorMessage } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { urlOf, type UrlEntry } from "@/lib/urls";

type TrackRow = {
  _id: Id<"tracks">;
  label: string;
  body: string;
  note: string;
};

type SubmissionRow = {
  name: string;
  description: string;
  urls: UrlEntry[];
  challengeIds: Id<"tracks">[];
  perkIds: Id<"perks">[];
  status: "draft" | "submitted";
};

type CatalogRow = {
  perk: { _id: Id<"perks">; company: string; title: string };
};

export default function TracksPage() {
  const tracks = useQuery(api.tracks.list);
  const settings = useQuery(api.tracks.settings);
  const mine = useQuery(api.submissions.mine);
  const catalog = useQuery(api.perks.listCatalog);

  if (tracks === undefined || settings === undefined || mine === undefined) {
    return <LoadingText />;
  }

  return (
    <TracksReady
      tracks={tracks}
      catalog={catalog}
      mine={mine}
      submissionsOpen={settings.submissionsOpen}
    />
  );
}

function TracksReady({
  tracks,
  catalog,
  mine,
  submissionsOpen,
}: {
  tracks: TrackRow[];
  catalog: CatalogRow[] | undefined;
  mine: SubmissionRow | null;
  submissionsOpen: boolean;
}) {
  const saveDraft = useMutation(api.submissions.saveDraft);
  const submit = useMutation(api.submissions.submit);
  const [name, setName] = useState(mine?.name ?? "");
  const [description, setDescription] = useState(mine?.description ?? "");
  const [repoUrl, setRepoUrl] = useState(urlOf(mine?.urls, "repo") ?? "");
  const [demoUrl, setDemoUrl] = useState(urlOf(mine?.urls, "demo") ?? "");
  const [challengeIds, setChallengeIds] = useState<Id<"tracks">[]>(
    mine?.challengeIds ?? [],
  );
  const [perkIds, setPerkIds] = useState<Id<"perks">[]>(mine?.perkIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const locked = mine?.status === "submitted";
  const entered = new Set(mine?.challengeIds ?? []);

  function toggleChallenge(id: Id<"tracks">) {
    setChallengeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function togglePerk(id: Id<"perks">) {
    setPerkIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const payload = {
    name,
    description,
    repoUrl: repoUrl || undefined,
    demoUrl: demoUrl || undefined,
    challengeIds,
    perkIds,
  };

  return (
    <Page
      title="Tracks"
      description="One project. Enter it in as many challenges as you want."
    >
      <FormError message={error} />
      <FormNotice message={message} />

      {tracks.length === 0 ? (
        <p className="text-hs-brown">Seeding tracks…</p>
      ) : (
        <div className="hs-stagger grid gap-4 md:grid-cols-2">
          {tracks.map((track) => (
            <Card key={track._id}>
              <CardHeader>
                <CardTitle className="text-xl">{track.label}</CardTitle>
                <CardDescription>{track.note}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{track.body}</p>
                {entered.has(track._id) ? (
                  <Badge variant="gold">
                    {mine?.status === "submitted" ? "Submitted" : "Draft entered"}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>
            Fill the project once, then pick every challenge it should enter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Project name" htmlFor="project-name">
            <Input
              id="project-name"
              value={name}
              disabled={locked}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="project-description">
            <Textarea
              id="project-description"
              value={description}
              disabled={locked}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Repo URL" htmlFor="repo-url">
              <Input
                id="repo-url"
                value={repoUrl}
                disabled={locked}
                placeholder="https://github.com/…"
                onChange={(event) => setRepoUrl(event.target.value)}
              />
            </Field>
            <Field label="Demo URL" htmlFor="demo-url">
              <Input
                id="demo-url"
                value={demoUrl}
                disabled={locked}
                placeholder="https://…"
                onChange={(event) => setDemoUrl(event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="font-bungee text-xs">Challenges</p>
            {tracks.map((track) => (
              <label key={track._id} className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={challengeIds.includes(track._id)}
                  disabled={locked}
                  onCheckedChange={() => toggleChallenge(track._id)}
                />
                <span>
                  {track.label}
                  <span className="block text-hs-brown">{track.note}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-bungee text-xs">Partner tools used</p>
            {!catalog ? (
              <p className="text-sm text-hs-brown">Loading partners…</p>
            ) : catalog.length === 0 ? (
              <p className="text-sm text-hs-brown">No partner tools published yet.</p>
            ) : (
              catalog.map(({ perk }) => (
                <label key={perk._id} className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={perkIds.includes(perk._id)}
                    disabled={locked}
                    onCheckedChange={() => togglePerk(perk._id)}
                  />
                  <span>
                    {perk.company} · {perk.title}
                  </span>
                </label>
              ))
            )}
          </div>

          {locked ? (
            <p className="text-sm text-hs-brown">This project is submitted and locked.</p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={saving}
                onClick={() => {
                  setError(null);
                  setSaving(true);
                  void saveDraft(payload)
                    .then(() => setMessage("Draft saved"))
                    .catch((err: unknown) =>
                      setError(errorMessage(err, "Could not save draft")),
                    )
                    .finally(() => setSaving(false));
                }}
              >
                Save draft
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={!submissionsOpen || saving}
                title={
                  submissionsOpen
                    ? undefined
                    : "Project submissions are not open yet"
                }
                onClick={() => {
                  if (!submissionsOpen) return;
                  setError(null);
                  setSaving(true);
                  void submit(payload)
                    .then(() => setMessage("Project submitted"))
                    .catch((err: unknown) =>
                      setError(errorMessage(err, "Could not submit")),
                    )
                    .finally(() => setSaving(false));
                }}
              >
                Submit project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          {submissionsOpen
            ? "Submissions are open. One project can enter multiple challenges."
            : "Project submission is not open yet. You can save a draft — including challenges and partner tools — and submit later."}
        </AlertDescription>
      </Alert>
    </Page>
  );
}
