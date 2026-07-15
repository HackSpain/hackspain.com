import nodemailer, { type Transporter } from "nodemailer";
import { envFromRuntime, siteOriginFromRuntime } from "./runtime-env";

interface SmtpConfig {
  fromAddress: string;
  fromName: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
}

function readSmtpConfig(): SmtpConfig | null {
  const host = envFromRuntime("SMTP_HOST");
  const user = envFromRuntime("SMTP_USER");
  const pass = envFromRuntime("SMTP_PASS");
  if (!(host && user && pass)) {
    return null;
  }
  const portRaw = envFromRuntime("SMTP_PORT") ?? "465";
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65_535) {
    return null;
  }
  const secure =
    (envFromRuntime("SMTP_SECURE") ?? (port === 465 ? "true" : "false")) ===
    "true";
  const fromAddress = envFromRuntime("SMTP_FROM") ?? user;
  const fromName = envFromRuntime("SMTP_FROM_NAME") ?? "HackSpain";
  return { host, port, secure, user, pass, fromName, fromAddress };
}

let cachedTransporter: Transporter | null = null;
let cachedKey = "";

function getTransporter(cfg: SmtpConfig): Transporter {
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}`;
  if (cachedTransporter && cachedKey === key) {
    return cachedTransporter;
  }
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  cachedKey = key;
  return cachedTransporter;
}

export interface ConfirmationEmailInput {
  email: string;
  fullName: string;
  wantsAmbassador: boolean;
}

export type ConfirmationEmailResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      reason: "community_url_missing" | "smtp_disabled" | "send_failed";
      detail?: string;
    };

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

function signupConfirmationText(
  input: Pick<ConfirmationEmailInput, "fullName" | "wantsAmbassador">
): string {
  const firstName = firstNameFrom(input.fullName);
  const ambassadorNote = input.wantsAmbassador
    ? "\n\nTambién hemos anotado que te interesa participar como embajador/a. Si tu perfil encaja, te escribiremos con los siguientes pasos."
    : "";

  return `Hola ${firstName},

¡Gracias por apuntarte a HackSpain 2026! Hemos recibido tu solicitud correctamente.

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
}

export interface PreSignupInvitationEmailInput extends PreSignupEmailInput {
  preSignupId: string;
  signupUrl: string;
}

export interface SignupAcceptedEmailInput {
  email: string;
  fullName: string;
  signupId: string;
}

export async function sendPreSignupConfirmationEmail(
  input: PreSignupEmailInput
): Promise<ConfirmationEmailResult> {
  const cfg = readSmtpConfig();
  if (!cfg) {
    return { ok: false, reason: "smtp_disabled" };
  }

  const organizerName = pickOrganizerName();
  const firstName = firstNameFrom(input.fullName);
  const text = `Hola ${firstName},

Soy ${organizerName}, del equipo de HackSpain. Solo quería confirmarte que tus datos nos han llegado bien, muchísimas gracias por el interés tan pronto, significa un montón.

Te iremos escribiendo por aquí con todas las novedades a medida que las tengamos.

Mientras tanto, te recomendamos seguirnos en Twitter para no perderte nada: https://x.com/hackspain26

Nos vemos pronto
${organizerName}`;

  try {
    const transporter = getTransporter(cfg);
    const info = await transporter.sendMail({
      from: {
        name: `${organizerName} de HackSpain`,
        address: cfg.user,
      },
      to: input.email,
      subject: "Hemos recibido tu pre-inscripción",
      text,
      headers: {
        "X-Entity-Ref-ID": `hackspain-pre-signup-${Date.now()}`,
      },
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const detail =
      e instanceof Error ? `${e.name}: ${e.message}` : String(e).slice(0, 256);
    return { ok: false, reason: "send_failed", detail };
  }
}

export async function sendSignupConfirmationEmail(
  input: ConfirmationEmailInput
): Promise<ConfirmationEmailResult> {
  const cfg = readSmtpConfig();
  if (!cfg) {
    return { ok: false, reason: "smtp_disabled" };
  }

  try {
    const transporter = getTransporter(cfg);
    const info = await transporter.sendMail({
      from: { name: cfg.fromName, address: cfg.fromAddress },
      to: input.email,
      subject: "Hemos recibido tu solicitud — HackSpain 2026",
      text: signupConfirmationText(input),
      headers: {
        "X-Entity-Ref-ID": `hackspain-signup-${Date.now()}`,
      },
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const detail =
      e instanceof Error ? `${e.name}: ${e.message}` : String(e).slice(0, 256);
    return { ok: false, reason: "send_failed", detail };
  }
}

export async function sendPreSignupInvitationEmail(
  input: PreSignupInvitationEmailInput
): Promise<ConfirmationEmailResult> {
  const cfg = readSmtpConfig();
  if (!cfg) {
    return { ok: false, reason: "smtp_disabled" };
  }

  const organizerName = pickOrganizerName();
  const firstName = firstNameFrom(input.fullName);
  const text = `Hola ${firstName},

La inscripción a HackSpain 2026 ya está abierta. Entra desde tu enlace personal, completa los datos restantes y envía tu solicitud.

${input.signupUrl}

Este enlace es único para ti, así que no lo compartas. Cuando termines, revisaremos tu solicitud y te escribiremos con la decisión.

Nos vemos dentro,
${organizerName} de HackSpain`;

  try {
    const transporter = getTransporter(cfg);
    const info = await transporter.sendMail({
      from: {
        name: `${organizerName} de HackSpain`,
        address: cfg.fromAddress,
      },
      to: input.email,
      subject: "Completa tu inscripción — HackSpain 2026",
      text,
      headers: {
        "X-Entity-Ref-ID": `hackspain-signup-invitation-${input.preSignupId}`,
      },
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const detail =
      e instanceof Error ? `${e.name}: ${e.message}` : String(e).slice(0, 256);
    return { ok: false, reason: "send_failed", detail };
  }
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
    return url.protocol === "https:" && isWhatsAppHost
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function sendSignupAcceptedEmail(
  input: SignupAcceptedEmailInput
): Promise<ConfirmationEmailResult> {
  const communityUrl = whatsappCommunityUrl();
  if (!communityUrl) {
    return { ok: false, reason: "community_url_missing" };
  }
  const cfg = readSmtpConfig();
  if (!cfg) {
    return { ok: false, reason: "smtp_disabled" };
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

  try {
    const transporter = getTransporter(cfg);
    const info = await transporter.sendMail({
      from: {
        name: `${organizerName} de HackSpain`,
        address: cfg.fromAddress,
      },
      to: input.email,
      subject: "¡Estás dentro! — HackSpain 2026",
      text,
      headers: {
        "X-Entity-Ref-ID": `hackspain-signup-approved-${input.signupId}`,
      },
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const detail =
      e instanceof Error ? `${e.name}: ${e.message}` : String(e).slice(0, 256);
    return { ok: false, reason: "send_failed", detail };
  }
}
