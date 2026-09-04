"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { AuthScreen, Field, FormError, LoadingText, errorMessage } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { phoneVerifyMessage } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const status = useQuery(api.onboarding.status);
  const requestPhoneCode = useMutation(api.onboarding.requestPhoneCode);
  const verifyPhoneCode = useMutation(api.onboarding.verifyPhoneCode);
  const confirmDetails = useMutation(api.onboarding.confirmDetails);

  const [phoneDraft, setPhoneDraft] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [dietaryDraft, setDietaryDraft] = useState<string | undefined>();
  const [dietaryDetailsDraft, setDietaryDetailsDraft] = useState<
    string | undefined
  >();
  const [travelDraft, setTravelDraft] = useState<string | undefined>();
  const [consentDraft, setConsentDraft] = useState<boolean | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const phone = phoneDraft ?? status?.phone ?? "";
  const dietaryRestrictions = dietaryDraft ?? status?.dietaryRestrictions ?? "";
  const dietaryDetails = dietaryDetailsDraft ?? status?.dietaryDetails ?? "";
  const travelOrigin = travelDraft ?? status?.travelOrigin ?? "";
  const consent = consentDraft ?? status?.notificationConsent ?? false;

  if (status === undefined) {
    return (
      <AuthScreen>
        <LoadingText />
      </AuthScreen>
    );
  }

  async function sendPhone() {
    setError(null);
    setPending(true);
    try {
      const result = await requestPhoneCode({ phone });
      setAwaitingCode(true);
      setDebugCode(result.debugCode ?? null);
    } catch (err) {
      setError(errorMessage(err, "Could not send code"));
    } finally {
      setPending(false);
    }
  }

  async function confirmPhone() {
    setError(null);
    setPending(true);
    try {
      const result = await verifyPhoneCode({ code });
      if (!result.ok) {
        setError(phoneVerifyMessage(result.reason));
        if (result.reason !== "incorrect") {
          setAwaitingCode(false);
          setCode("");
          setDebugCode(null);
        }
      }
    } catch (err) {
      setError(errorMessage(err, "Could not verify phone"));
    } finally {
      setPending(false);
    }
  }

  async function finish(attendanceStatus: "attending" | "cancelled") {
    setError(null);
    setPending(true);
    try {
      await confirmDetails({
        dietaryRestrictions,
        dietaryDetails: dietaryDetails || undefined,
        travelOrigin,
        consent,
        attendanceStatus,
      });
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err, "Could not save your details"));
    } finally {
      setPending(false);
    }
  }

  const phoneConfirmed = status.phoneConfirmed;

  return (
    <AuthScreen>
      <Card className="hs-enter w-full max-w-lg">
        <CardHeader>
          <p className="font-bungee text-xs text-hs-brown">Accepted hacker</p>
          <CardTitle className="text-2xl sm:text-3xl">Confirm your details</CardTitle>
          <CardDescription>
            Phone, diet, and where you travel from. You can edit these later in
            your profile, including if you need to cancel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormError message={error} />

          <div className="space-y-4">
            <Field label="Phone (E.164)" htmlFor="phone">
              <Input
                id="phone"
                placeholder="+34600111222"
                value={phone}
                onChange={(event) => setPhoneDraft(event.target.value)}
                disabled={phoneConfirmed}
              />
            </Field>
            {phoneConfirmed ? (
              <p className="text-sm text-hs-brown">
                Confirmed{status.phone ? ` · ${status.phone}` : ""}.
              </p>
            ) : !awaitingCode ? (
              <Button
                className="w-full sm:w-auto"
                onClick={() => void sendPhone()}
                disabled={pending}
              >
                {pending ? "Sending…" : "Send confirmation code"}
              </Button>
            ) : (
              <>
                <Alert>
                  <AlertDescription>
                    {status.smsConfigured
                      ? "A text is on its way."
                      : "SMS is not configured. Twilio env vars are documented in the README. For local setup the code is shown below and in Convex logs. It is not auto-confirmed."}
                    {debugCode ? (
                      <span className="mt-2 block font-bungee text-hs-navy">
                        Stub code: {debugCode}
                      </span>
                    ) : null}
                  </AlertDescription>
                </Alert>
                <Field label="Confirmation code" htmlFor="phone-code">
                  <Input
                    id="phone-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </Field>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => void confirmPhone()}
                  disabled={pending}
                >
                  {pending ? "Checking…" : "Confirm phone"}
                </Button>
              </>
            )}
          </div>

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
              placeholder="Allergies, severity, or anything kitchen should know"
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

          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => setConsentDraft(value === true)}
            />
            <span>
              I agree to receive HackSpain operational notifications (schedule,
              perks, and day-of updates).
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1"
              disabled={pending}
              onClick={() => void finish("attending")}
            >
              I will attend
            </Button>
            <Button
              variant="teal"
              className="flex-1"
              disabled={pending}
              onClick={() => void finish("cancelled")}
            >
              I need to cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
