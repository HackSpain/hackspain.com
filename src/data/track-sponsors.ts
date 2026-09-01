import {
  embatLogo,
  happyrobotLogo,
  maisaLogo,
  prosperAiLogo,
  theckerLogo,
} from "../components/theme/assets";

export interface TrackSponsor {
  /** Brand accent for the card header band. */
  accent: string;
  /** Text color that reads on `accent`. */
  accentText: string;
  careersUrl: string;
  description: string;
  /** Stable key, also used as the card anchor id. */
  id: string;
  /** Tailwind height class — some wordmarks need more room to read at parity. */
  logoHeight: string;
  logoSrc: string;
  name: string;
  /**
   * Total publicly announced funding. These go stale every time a sponsor
   * raises — re-check before each launch push.
   */
  raised: string;
  /** One-line positioning, shown under the name. */
  tagline: string;
}

/**
 * The five startups behind the tracks, shown as cards in the tracks overlay.
 * Keep this list in sync with TRACK_SPONSORS in components/sections/partner-logos.tsx,
 * which drives the same five logos in the mosaic row.
 */
export const TRACK_SPONSORS_DETAIL: TrackSponsor[] = [
  {
    accent: "bg-hs-gold",
    accentText: "text-hs-ink",
    careersUrl: "https://maisa.ai/careers",
    description:
      "Construye «Digital Workers»: agentes de IA auditables que automatizan procesos completos en banca, seguros e industria. Cerró 25M$ liderados por Creandum y Forgepoint para atacar el 95% de proyectos de IA empresarial que fracasan.",
    id: "maisa",
    logoHeight: "h-[clamp(2.2rem,5vw,3rem)]",
    logoSrc: maisaLogo.src,
    name: "Maisa",
    raised: "$30M",
    tagline: "Agentes de IA con trazabilidad para la empresa",
  },
  {
    accent: "bg-hs-teal",
    accentText: "text-hs-paper",
    careersUrl: "https://www.happyrobot.ai/careers",
    description:
      "Agentes de IA que ejecutan operaciones completas por voz, email, chat y sistemas empresariales. Con más de 150 grandes clientes y un crecimiento de 5× desde su Serie B, levantó una Serie C de 150M$ que la valora en 1.200M$.",
    id: "happyrobot",
    logoHeight: "h-[clamp(1.5rem,3.6vw,2.1rem)]",
    logoSrc: happyrobotLogo.src,
    name: "HappyRobot",
    raised: "$200M+",
    tagline: "El sistema operativo de IA de la economía real",
  },
  {
    accent: "bg-hs-red",
    accentText: "text-hs-paper",
    careersUrl: "https://www.getprosper.ai/careers",
    description:
      "Automatiza de punta a punta el recorrido del paciente en clínicas de EE. UU.: citas, verificación de seguros y facturación. Gestiona flujos de más de 150.000 médicos y levantó 30M$ liderados por a16z.",
    id: "prosper-ai",
    logoHeight: "h-[clamp(1.7rem,4vw,2.4rem)]",
    logoSrc: prosperAiLogo.src,
    name: "Prosper AI",
    raised: "$35M",
    tagline: "IA para las operaciones sanitarias",
  },
  {
    accent: "bg-hs-navy",
    accentText: "text-hs-paper",
    careersUrl: "https://www.embat.io/work-with-us",
    description:
      "Tesorería en tiempo real con IA para equipos financieros de medianas y grandes empresas. Automatiza hasta el 80% del trabajo manual, con 400 clientes en Europa y una Serie B de 30M€ liderada por Cathay Innovation.",
    id: "embat",
    logoHeight: "h-[clamp(1.5rem,3.6vw,2.1rem)]",
    logoSrc: embatLogo.src,
    name: "Embat",
    raised: "€50M+",
    tagline: "El sistema operativo de la tesorería europea",
  },
  {
    accent: "bg-hs-orange",
    accentText: "text-hs-paper",
    careersUrl: "https://www.theker.ai/careers",
    description:
      "Robots industriales reconfigurables, entrenados con IA para no especializarse en una sola tarea. Desde Barcelona, con la mayor Serie A de robótica de Europa: +100M$ liderados por CRV, con Samsung, LVMH e Inditex dentro.",
    id: "theker",
    logoHeight: "h-[clamp(1.5rem,3.6vw,2.1rem)]",
    logoSrc: theckerLogo.src,
    name: "THEKER Robotics",
    raised: "+$100M",
    tagline: "Robótica de propósito general made in Spain",
  },
];
