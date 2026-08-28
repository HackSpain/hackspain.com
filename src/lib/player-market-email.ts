import {
  type ConfirmationEmailResult,
  sendEmail,
} from "./signup-confirmation-email";

interface PlayerMarketAccessEmailInput {
  email: string;
  expiresAt: Date;
  link: string;
  name: string;
  purpose: "company" | "player";
  reference: string;
}

export function sendPlayerMarketAccessEmail(
  input: PlayerMarketAccessEmailInput
): Promise<ConfirmationEmailResult> {
  const isPlayer = input.purpose === "player";
  const subject = isPlayer
    ? "Tu enlace privado de Player Market — HackSpain"
    : "Verifica tu empresa en Player Market — HackSpain";
  const action = isPlayer
    ? "revisar tu ficha y gestionar tus ofertas"
    : "verificar tu email y preparar una oferta";
  const text = `Hola ${input.name},

Usa este enlace privado para ${action}:
${input.link}

El enlace caduca a las ${input.expiresAt.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  })} y solo puede utilizarse una vez.

Si no has solicitado este acceso, puedes ignorar el correo.

El equipo de HackSpain`;

  return sendEmail({
    category: `player_market_${input.purpose}_access`,
    entityReference: `player-market-${input.reference}`,
    idempotencyKey: `player-market-access/${input.reference}`,
    subject,
    text,
    to: input.email,
  });
}
