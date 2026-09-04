"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { Field, FormError, LoadingText, Page, errorMessage } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Frame } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@convex/_generated/dataModel";

export default function TeamsPage() {
  const team = useQuery(api.teams.mine);
  const create = useMutation(api.teams.create);
  const rename = useMutation(api.teams.rename);
  const addMember = useMutation(api.teams.addMember);
  const removeMember = useMutation(api.teams.removeMember);
  const leave = useMutation(api.teams.leave);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "github" | "twitter">(
    "github",
  );
  const [error, setError] = useState<string | null>(null);

  if (team === undefined) return <LoadingText />;

  return (
    <Page title="Team">
      <FormError message={error} />

      {!team ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a team</CardTitle>
            <CardDescription>
              Add people by GitHub username, X handle, or email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Team name" htmlFor="team-name">
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Button
              onClick={() => {
                setError(null);
                void create({ name }).catch((err: unknown) =>
                  setError(errorMessage(err, "Could not create")),
                );
              }}
            >
              Create team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>
              {team.isOwner ? "You own this team." : "You are a member."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {team.isOwner ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={name || team.name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void rename({ teamId: team._id, name: name || team.name })
                  }
                >
                  Rename
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              {team.members.map((member) => (
                <Frame
                  key={member._id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words">
                      {member.name ?? member.identifier}
                    </p>
                    <p className="text-xs break-all text-hs-brown">
                      {member.identifierType}: {member.identifier}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{member.status}</Badge>
                    {team.isOwner && member.userId !== team.ownerId ? (
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          void removeMember({
                            memberId: member._id as Id<"teamMembers">,
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </Frame>
              ))}
            </div>

            {team.isOwner ? (
              <div className="grid gap-3 sm:grid-cols-[160px_1fr] lg:grid-cols-[160px_1fr_auto]">
                <Select
                  value={identifierType}
                  onValueChange={(value) =>
                    setIdentifierType(value as "email" | "github" | "twitter")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="twitter">X / Twitter</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder={
                    identifierType === "email"
                      ? "name@email.com"
                      : identifierType === "github"
                        ? "username"
                        : "@handle"
                  }
                />
                <Button
                  className="w-full lg:w-auto"
                  onClick={() => {
                    setError(null);
                    void addMember({
                      teamId: team._id,
                      identifierType,
                      identifier,
                    })
                      .then(() => setIdentifier(""))
                      .catch((err: unknown) =>
                        setError(errorMessage(err, "Could not add")),
                      );
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}

            {!team.isOwner ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setError(null);
                  void leave({}).catch((err: unknown) =>
                    setError(errorMessage(err, "Could not leave the team")),
                  );
                }}
              >
                Leave team
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
