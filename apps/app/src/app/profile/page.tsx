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
import { useGithubLink } from "@/components/github-link-banner";
import { phoneVerifyMessage } from "@/lib/utils";

function GithubCard({
  linked,
  username,
}: {
  linked: boolean;
  username?: string;
}) {
  const { link, pending, error } = useGithubLink();
  const unlink = useMutation(api.github.unlink);
  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>
          {linked && username
            ? `Vinculado como @${username}.`
            : "Vincula tu cuenta para que te encontremos en tu equipo y ligar tu proyecto."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <FormError message={error} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            variant={linked ? "outline" : "default"}
            disabled={pending}
            onClick={() => void link()}
          >
            {pending ? "Abriendo GitHub…" : linked ? "Volver a vincular" : "Vincular GitHub"}
          </Button>
          {linked ? (
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => void unlink({})}
            >
              Desvincular
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

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
    <Page title="Perfil" description="Edita los datos que confirmaste al ser aceptado.">
      <FormError message={error} />
      <FormNotice message={message} />
      <Card>
        <CardHeader>
          <CardTitle>Asistencia</CardTitle>
          <CardDescription>
            Contamos con que vienes. Cancela aquí si no puedes asistir.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            variant={me.attendanceStatus === "attending" ? "default" : "outline"}
            onClick={() =>
              void setAttendance({ attendanceStatus: "attending" }).then(() =>
                setMessage("Marcado como asistiré"),
              )
            }
          >
            Asistiré
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant={me.attendanceStatus === "cancelled" ? "teal" : "outline"}
            onClick={() =>
              void setAttendance({ attendanceStatus: "cancelled" }).then(() =>
                setMessage("Marcado como cancelado"),
              )
            }
          >
            Cancelo
          </Button>
        </CardContent>
      </Card>
      <GithubCard linked={me.githubLinked} username={me.githubUsername} />
      <Card>
        <CardHeader>
          <CardTitle>Dieta y viaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Restricciones alimentarias" htmlFor="dietary">
            <Input
              id="dietary"
              placeholder="Ninguna, vegetariano, vegano, alergias…"
              value={dietaryRestrictions}
              onChange={(event) => setDietaryDraft(event.target.value)}
            />
          </Field>
          <Field label="Detalles de dieta (opcional)" htmlFor="dietary-details">
            <Textarea
              id="dietary-details"
              value={dietaryDetails}
              onChange={(event) => setDietaryDetailsDraft(event.target.value)}
            />
          </Field>
          <Field label="¿Desde dónde viajas?" htmlFor="travel-origin">
            <Input
              id="travel-origin"
              placeholder="Ciudad o región"
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
                .then(() => setMessage("Dieta y viaje guardados"))
                .catch((err: unknown) =>
                  setError(errorMessage(err, "No se han podido guardar")),
                );
            }}
          >
            Guardar dieta y viaje
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Avisos</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={me.notificationConsent}
              onCheckedChange={(value) =>
                void setConsent({ consent: value === true }).then(() =>
                  setMessage("Preferencia de avisos guardada"),
                )
              }
            />
            <span>Quiero avisos operativos de HackSpain.</span>
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Teléfono</CardTitle>
          <CardDescription>
            Actual: {me.phone ?? "sin número"} {me.phoneConfirmed ? "(confirmado)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Número nuevo" htmlFor="phone">
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
                  setMessage("Introduce el código de confirmación");
                })
                .catch((err: unknown) => setError(errorMessage(err, "No hemos podido enviar el código")));
            }}
          >
            Enviar código
          </Button>
          {debugCode ? (
            <p className="font-bungee text-sm text-hs-navy">Código de prueba: {debugCode}</p>
          ) : null}
          <Field label="Código" htmlFor="code">
            <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} />
          </Field>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setError(null);
              void verifyPhoneCode({ code })
                .then((result) => {
                  if (result.ok) {
                    setMessage("Teléfono confirmado");
                    setCode("");
                    setDebugCode(null);
                  } else {
                    setError(phoneVerifyMessage(result.reason));
                  }
                })
                .catch((err: unknown) => setError(errorMessage(err, "No hemos podido verificar")));
            }}
          >
            Confirmar teléfono
          </Button>
        </CardContent>
      </Card>
    </Page>
  );
}
