import { type CreateEmailOptions, Resend } from "resend";
import { envFromRuntime, siteOriginFromRuntime } from "./runtime-env";

interface ResendConfig {
  apiKey: string;
  from: string;
}

function readResendConfig(): ResendConfig | null {
  const apiKey = envFromRuntime("RESEND_API_KEY");
  const from = envFromRuntime("RESEND_FROM");
  if (!(apiKey && from)) {
    return null;
  }
  return { apiKey, from };
}

let cachedResend: Resend | null = null;
let cachedApiKey = "";

function getResend(apiKey: string): Resend {
  if (cachedResend && cachedApiKey === apiKey) {
    return cachedResend;
  }
  cachedResend = new Resend(apiKey);
  cachedApiKey = apiKey;
  return cachedResend;
}

export interface ConfirmationEmailInput {
  email: string;
  fullName: string;
  signupId: string;
  wantsAmbassador: boolean;
}

export type ConfirmationEmailResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      reason: "community_url_missing" | "resend_disabled" | "send_failed";
      detail?: string;
    };

interface SendEmailInput {
  category: string;
  entityReference: string;
  html?: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
}

async function sendEmail(
  input: SendEmailInput
): Promise<ConfirmationEmailResult> {
  const config = readResendConfig();
  if (!config) {
    return { ok: false, reason: "resend_disabled" };
  }

  const payload: CreateEmailOptions = {
    from: config.from,
    headers: { "X-Entity-Ref-ID": input.entityReference },
    subject: input.subject,
    tags: [{ name: "category", value: input.category }],
    text: input.text,
    to: input.to,
    ...(input.html ? { html: input.html } : {}),
  };

  try {
    const result = await getResend(config.apiKey).emails.send(payload, {
      idempotencyKey: input.idempotencyKey,
    });
    if (result.error) {
      return {
        ok: false,
        reason: "send_failed",
        detail: `${result.error.name}: ${result.error.message}`,
      };
    }
    return { ok: true, messageId: result.data.id };
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error).slice(0, 256);
    return { ok: false, reason: "send_failed", detail };
  }
}

const ORGANIZER_NAMES = ["Leo", "Samu", "Guli"] as const;
const WHITESPACE_SPLIT_RE = /\s+/;

function firstNameFrom(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return "hacker";
  }
  const first = trimmed.split(WHITESPACE_SPLIT_RE)[0];
  return first.length > 24 ? first.slice(0, 24) : first;
}

function pickOrganizerName(): string {
  const index = Math.floor(Math.random() * ORGANIZER_NAMES.length);
  return ORGANIZER_NAMES[index] ?? ORGANIZER_NAMES[0];
}

function signupFormUrl(): string {
  return new URL("/signup", siteOriginFromRuntime()).toString();
}

function referralSignupFormUrl(shareCode: string): string {
  const url = new URL("/signup", siteOriginFromRuntime());
  url.searchParams.set("ref", shareCode);
  return url.toString();
}

function signupCancellationUrl(cancellationToken: string): string {
  const url = new URL("/cancelacion", siteOriginFromRuntime());
  url.searchParams.set("token", cancellationToken);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character
  );
}

function signupConfirmationText(input: ConfirmationEmailInput): string {
  const firstName = firstNameFrom(input.fullName);
  const ambassadorNote = input.wantsAmbassador
    ? "\n\nTambién hemos anotado que te interesa participar como embajador/a. Si tu perfil encaja, te escribiremos con los siguientes pasos."
    : "";

  return `Hola ${firstName},

Gracias por apuntarte a HackSpain 2026! Hemos recibido tu solicitud correctamente.

Vamos a revisar cada candidatura personalmente. Cuando tengamos novedades sobre tu plaza, te escribiremos a este mismo correo.${ambassadorNote}

Mientras tanto, puedes seguirnos para estar al día:

X: https://x.com/hackspain26
Instagram: https://www.instagram.com/hackspain26/

Si quieres compartir la inscripción con alguien, usa este enlace:
${signupFormUrl()}

Nos vemos pronto,
El equipo de HackSpain

Has recibido este correo porque enviaste una solicitud desde ${siteOriginFromRuntime()}. Si no has sido tú, puedes ignorarlo.`;
}

export interface PreSignupEmailInput {
  email: string;
  fullName: string;
  preSignupId: string;
}

export interface PreSignupInvitationEmailInput extends PreSignupEmailInput {
  shareCode: string;
  signupUrl: string;
}

export interface SignupAcceptedEmailInput {
  email: string;
  fullName: string;
  signupId: string;
}

export interface SignupCancellationEmailInput {
  cancellationToken: string;
  email: string;
  fullName: string;
  requestedAt: string;
  signupId: string;
}

export function sendPreSignupConfirmationEmail(
  input: PreSignupEmailInput
): Promise<ConfirmationEmailResult> {
  const organizerName = pickOrganizerName();
  const firstName = firstNameFrom(input.fullName);
  const text = `Hola ${firstName},

Soy ${organizerName}, del equipo de HackSpain. Solo quería confirmarte que tus datos nos han llegado bien, muchísimas gracias por el interés tan pronto, significa un montón.

Te iremos escribiendo por aquí con todas las novedades a medida que las tengamos.

Mientras tanto, te recomendamos seguirnos en Twitter para no perderte nada: https://x.com/hackspain26

Nos vemos pronto
${organizerName}`;

  return sendEmail({
    category: "pre_signup_confirmation",
    entityReference: `hackspain-pre-signup-${input.preSignupId}`,
    idempotencyKey: `pre-signup-confirmation/${input.preSignupId}`,
    subject: "Hemos recibido tu pre-inscripción",
    text,
    to: input.email,
  });
}

export function sendSignupConfirmationEmail(
  input: ConfirmationEmailInput
): Promise<ConfirmationEmailResult> {
  return sendEmail({
    category: "signup_confirmation",
    entityReference: `hackspain-signup-${input.signupId}`,
    idempotencyKey: `signup-confirmation/${input.signupId}`,
    subject: "Hemos recibido tu solicitud — HackSpain 2026",
    text: signupConfirmationText(input),
    to: input.email,
  });
}

export function sendPreSignupInvitationEmail(
  input: PreSignupInvitationEmailInput
): Promise<ConfirmationEmailResult> {
  const organizerName = pickOrganizerName();
  const firstName = firstNameFrom(input.fullName);
  const personalUrl = escapeHtml(input.signupUrl);
  const shareUrl = referralSignupFormUrl(input.shareCode);
  const text = `Hola ${firstName},

Hace unos días te escribimos porque abrimos la inscripción de HackSpain. Te volvemos a dejar tu enlace personal por aquí, por si todavía no has podido terminarla:

${input.signupUrl}

Ya tenemos guardados los datos que nos diste en la pre-inscripción. Al entrar los verás completados; solo tendrás que añadir el resto de información y enviar tu solicitud.

Este enlace es único para ti, así que no lo compartas.

Si quieres compartir la inscripción con alguien, usa este enlace. Así sabremos que viene de tu parte:
${shareUrl}

Cuando la envíes, revisaremos tu solicitud y te escribiremos con la decisión.

Nos vemos pronto,
${organizerName} de HackSpain`;
  const html = `<p>Hola ${escapeHtml(firstName)},</p>
<p>Hace unos días te escribimos porque abrimos la inscripción de HackSpain. Te volvemos a dejar tu enlace personal por aquí, por si todavía no has podido terminarla:</p>
<p><a href="${personalUrl}">Haz click aquí</a></p>
<p>Ya tenemos guardados los datos que nos diste en la pre-inscripción. Al entrar los verás completados; solo tendrás que añadir el resto de información y enviar tu solicitud.</p>
<p>Este enlace es único para ti, así que no lo compartas.</p>
<p>Si quieres compartir la inscripción con alguien, usa este enlace. Así sabremos que viene de tu parte:<br><a href="${escapeHtml(shareUrl)}">${escapeHtml(shareUrl)}</a></p>
<p>Cuando la envíes, revisaremos tu solicitud y te escribiremos con la decisión.</p>
<p>Nos vemos pronto,<br>${escapeHtml(organizerName)} de HackSpain</p>`;

  return sendEmail({
    category: "pre_signup_invitation",
    entityReference: `hackspain-signup-invitation-${input.preSignupId}`,
    html,
    idempotencyKey: `pre-signup-invitation/${input.preSignupId}`,
    subject: "Completa tu inscripción — HackSpain 2026",
    text,
    to: input.email,
  });
}

function whatsappCommunityUrl(): string | null {
  const raw = envFromRuntime("WHATSAPP_COMMUNITY_URL");
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    const isWhatsAppHost =
      url.hostname === "chat.whatsapp.com" ||
      url.hostname === "whatsapp.com" ||
      url.hostname === "www.whatsapp.com";
    return url.protocol === "https:" && isWhatsAppHost ? url.toString() : null;
  } catch {
    return null;
  }
}

export function sendSignupAcceptedEmail(
  input: SignupAcceptedEmailInput
): Promise<ConfirmationEmailResult> {
  const communityUrl = whatsappCommunityUrl();
  if (!communityUrl) {
    return Promise.resolve({ ok: false, reason: "community_url_missing" });
  }

  const organizerName = pickOrganizerName();
  const firstName = firstNameFrom(input.fullName);
  const text = `Hola ${firstName},

Estás dentro de HackSpain 2026.

Hemos revisado tu solicitud y queremos contar contigo en HackSpain 2026. Ya solo te queda entrar en la comunidad oficial de WhatsApp. Ahí compartiremos los próximos pasos, avisos importantes y todo lo necesario para llegar preparado.

${communityUrl}

Este enlace es solo para participantes aceptados. No lo compartas fuera de la comunidad.

Nos vemos dentro,
${organizerName} de HackSpain`;

  return sendEmail({
    category: "signup_accepted",
    entityReference: `hackspain-signup-approved-${input.signupId}`,
    idempotencyKey: `signup-accepted/${input.signupId}`,
    subject: "Estás dentro! — HackSpain 2026",
    text,
    to: input.email,
  });
}

export function sendSignupCancellationEmail(
  input: SignupCancellationEmailInput
): Promise<ConfirmationEmailResult> {
  const firstName = firstNameFrom(input.fullName);
  const cancellationUrl = signupCancellationUrl(input.cancellationToken);
  const text = `Hola ${firstName},

Hemos recibido una solicitud para cancelar tu participación en HackSpain 2026.

Confirma la cancelación desde este enlace personal:
${cancellationUrl}

Abrir el enlace no cancela nada: tendrás que confirmar la acción en la página. Si no has solicitado la cancelación, puedes ignorar este correo y tu participación no cambiará.

El equipo de HackSpain`;

  return sendEmail({
    category: "signup_cancellation",
    entityReference: `hackspain-signup-cancellation-${input.signupId}`,
    idempotencyKey: `signup-cancellation/${input.signupId}/${input.requestedAt}`,
    subject: "Confirma la cancelación — HackSpain 2026",
    text,
    to: input.email,
  });
}
