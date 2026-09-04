"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { Field, FormError, FormNotice, LoadingText, Page, errorMessage } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { phoneVerifyMessage } from "@/lib/utils";

export default function ProfilePage() {
  const me = useQuery(api.users.me);
  const setAttendance = useMutation(api.users.setAttendance);
  const setConsent = useMutation(api.users.setNotificationConsent);
  const updateEventDetails = useMutation(api.users.updateEventDetails);
  const requestPhoneCode = useMutation(api.onboarding.requestPhoneCode);
  const verifyPhoneCode = useMutation(api.onboarding.verifyPhoneCode);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [dietaryDraft, setDietaryDraft] = useState<string | undefined>();
  const [dietaryDetailsDraft, setDietaryDetailsDraft] = useState<
    string | undefined
  >();
  const [travelDraft, setTravelDraft] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dietaryRestrictions = dietaryDraft ?? me?.dietaryRestrictions ?? "";
  const dietaryDetails = dietaryDetailsDraft ?? me?.dietaryDetails ?? "";
  const travelOrigin = travelDraft ?? me?.travelOrigin ?? "";

  if (!me) return <LoadingText />;

  return (
    <Page title="Profile" description="Edit the details you confirmed after acceptance.">
      <FormError message={error} />
      <FormNotice message={message} />
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>Tell us if you are coming. You can cancel here.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            variant={me.attendanceStatus === "attending" ? "default" : "outline"}
            onClick={() =>
              void setAttendance({ attendanceStatus: "attending" }).then(() =>
                setMessage("Marked as attending"),
              )
            }
          >
            Attending
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant={me.attendanceStatus === "cancelled" ? "teal" : "outline"}
            onClick={() =>
              void setAttendance({ attendanceStatus: "cancelled" }).then(() =>
                setMessage("Marked as cancelled"),
              )
            }
          >
            Cancelled
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Diet and travel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Dietary restrictions" htmlFor="dietary">
            <Input
              id="dietary"
              placeholder="None, vegetarian, vegan, allergies…"
              value={dietaryRestrictions}
              onChange={(event) => setDietaryDraft(event.target.value)}
            />
          </Field>
          <Field label="Dietary details (optional)" htmlFor="dietary-details">
            <Textarea
              id="dietary-details"
              value={dietaryDetails}
              onChange={(event) => setDietaryDetailsDraft(event.target.value)}
            />
          </Field>
          <Field label="Where do you travel from?" htmlFor="travel-origin">
            <Input
              id="travel-origin"
              placeholder="City or region"
              value={travelOrigin}
              onChange={(event) => setTravelDraft(event.target.value)}
            />
          </Field>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setError(null);
              void updateEventDetails({
                dietaryRestrictions,
                dietaryDetails: dietaryDetails || undefined,
                travelOrigin,
              })
                .then(() => setMessage("Diet and travel saved"))
                .catch((err: unknown) =>
                  setError(errorMessage(err, "Could not save details")),
                );
            }}
          >
            Save diet and travel
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={me.notificationConsent}
              onCheckedChange={(value) =>
                void setConsent({ consent: value === true }).then(() =>
                  setMessage("Notification preference saved"),
                )
              }
            />
            <span>I want operational notifications from HackSpain.</span>
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Phone</CardTitle>
          <CardDescription>
            Current: {me.phone ?? "not set"} {me.phoneConfirmed ? "(confirmed)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="New number" htmlFor="phone">
            <Input
              id="phone"
              value={phone}
              placeholder="+34600111222"
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setError(null);
              void requestPhoneCode({ phone })
                .then((result) => {
                  setDebugCode(result.debugCode ?? null);
                  setMessage("Enter the confirmation code");
                })
                .catch((err: unknown) => setError(errorMessage(err, "Could not send code")));
            }}
          >
            Send confirmation code
          </Button>
          {debugCode ? (
            <p className="font-bungee text-sm text-hs-navy">Stub code: {debugCode}</p>
          ) : null}
          <Field label="Code" htmlFor="code">
            <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setError(null);
              void verifyPhoneCode({ code })
                .then((result) => {
                  if (result.ok) {
                    setMessage("Phone confirmed");
                    setCode("");
                    setDebugCode(null);
                  } else {
                    setError(phoneVerifyMessage(result.reason));
                  }
                })
                .catch((err: unknown) => setError(errorMessage(err, "Could not verify")));
            }}
          >
            Confirm phone
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}
