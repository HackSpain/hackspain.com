"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import {
  Field,
  FormError,
  FormNotice,
  Page,
  errorMessage,
} from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Audience = "all" | "accepted" | "attending" | "user";

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "All consenting users",
  accepted: "Accepted hackers",
  attending: "Attending hackers",
  user: "Single user",
};

export default function AdminNotificationsPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const count = useQuery(api.notifications.recipientCount, {
    audience,
    recipientEmail: audience === "user" ? recipientEmail : undefined,
  });
  const history = useQuery(api.notifications.list);
  const send = useMutation(api.notifications.send);

  async function submit() {
    setError(null);
    setNotice(null);
    if (count === undefined || count === 0) return;
    const ok = window.confirm(
      `Email "${subject.trim()}" to ${count} recipient${count === 1 ? "" : "s"}?`,
    );
    if (!ok) return;
    setPending(true);
    try {
      await send({
        subject,
        body,
        audience,
        recipientEmail: audience === "user" ? recipientEmail : undefined,
      });
      setNotice(`Queued for ${count} recipient${count === 1 ? "" : "s"}.`);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(errorMessage(err, "Could not send the notification"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page
      title="Notifications"
      description="Email users who consented to operational notifications."
    >
      <Card className="hs-enter">
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>
            Plain-text email sent from the HackSpain address. Only users with
            notification consent receive it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormError message={error} />
          <FormNotice message={notice} />
          <Field label="Subject" htmlFor="notif-subject">
            <Input
              id="notif-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field label="Body" htmlFor="notif-body">
            <Textarea
              id="notif-body"
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Audience">
              <Select
                value={audience}
                onValueChange={(next) => setAudience(next as Audience)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{AUDIENCE_LABEL.all}</SelectItem>
                  <SelectItem value="accepted">
                    {AUDIENCE_LABEL.accepted}
                  </SelectItem>
                  <SelectItem value="attending">
                    {AUDIENCE_LABEL.attending}
                  </SelectItem>
                  <SelectItem value="user">{AUDIENCE_LABEL.user}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {audience === "user" ? (
              <Field label="User email" htmlFor="notif-email">
                <Input
                  id="notif-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                />
              </Field>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              className="w-full sm:w-auto"
              disabled={
                pending ||
                count === undefined ||
                count === 0 ||
                !subject.trim() ||
                !body.trim()
              }
              onClick={() => void submit()}
            >
              {pending ? "Sending…" : "Send"}
            </Button>
            <p className="text-sm text-hs-brown">
              {count === undefined
                ? "Counting recipients…"
                : `Will reach ${count} recipient${count === 1 ? "" : "s"}.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="font-bungee text-lg">Past sends</h2>
        {history === undefined ? (
          <p className="text-sm text-hs-brown">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-hs-brown">Nothing sent yet.</p>
        ) : (
          history.map((item) => (
            <Card key={item._id} className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">{item.subject}</CardTitle>
                <CardDescription>
                  {new Date(item.sentAt).toLocaleString()}
                  {item.sentByEmail ? ` · by ${item.sentByEmail}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap break-words">{item.body}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.status === "sent" ? "gold" : "default"}>
                    {item.status}
                  </Badge>
                  <Badge>
                    {AUDIENCE_LABEL[item.audience]}
                    {item.recipientEmail ? ` · ${item.recipientEmail}` : ""}
                  </Badge>
                  <span>
                    {item.sentCount}/{item.recipientCount} delivered
                    {item.failures.length > 0
                      ? ` · ${item.failures.length} failed`
                      : ""}
                  </span>
                </div>
                {item.failures.length > 0 ? (
                  <details className="text-xs text-hs-brown">
                    <summary className="cursor-pointer font-bungee">
                      Failures
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {item.failures.map((failure) => (
                        <li key={failure.email} className="break-words">
                          {failure.email}: {failure.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Page>
  );
}
