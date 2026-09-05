export const HARNESSES = [
  {
    id: "claude-code",
    name: "Claude Code",
    mark: "CC",
    color: "#d96b2a",
    models: [0, 100, 0, 0],
  },
  {
    id: "codex",
    name: "Codex",
    mark: ">_",
    color: "#35858a",
    models: [100, 0, 0, 0],
  },
  {
    id: "cursor",
    name: "Cursor",
    mark: "Cu",
    color: "#1e3958",
    models: [42, 43, 12, 3],
  },
  {
    id: "opencode",
    name: "OpenCode",
    mark: "OC",
    color: "#8b6b9f",
    models: [28, 38, 19, 15],
  },
  {
    id: "cline",
    name: "Cline",
    mark: "Cl",
    color: "#a67516",
    models: [21, 52, 18, 9],
  },
  {
    id: "copilot",
    name: "Copilot",
    mark: "Co",
    color: "#677558",
    models: [57, 34, 6, 3],
  },
] as const;

export const MODELS = ["GPT", "Claude", "Gemini", "Otros"] as const;
export const TRACKS = ["Agents", "DevTools", "Impacto"] as const;
export const PERIODS = [
  { id: "event", label: "Todo el evento", buckets: 24 },
  { id: "6h", label: "Últimas 6 horas", buckets: 12 },
  { id: "1h", label: "Última hora", buckets: 2 },
] as const;

export type Period = (typeof PERIODS)[number]["id"];
export type Track = (typeof TRACKS)[number];
export type HarnessId = (typeof HARNESSES)[number]["id"];
export type Metric = "tokens" | "commits" | "pullRequests";

export interface Team {
  id: string;
  name: string;
  project: string;
  description: string;
  track: Track;
  members: number;
  primary: HarnessId;
  secondary: HarnessId;
  color: string;
}

export const TEAMS: Team[] = [
  {
    id: "tortilla",
    name: "Tortilla Overflow",
    project: "AgentOS",
    description:
      "Un espacio de trabajo donde agentes y personas construyen juntos.",
    track: "Agents",
    members: 4,
    primary: "claude-code",
    secondary: "codex",
    color: "#d96b2a",
  },
  {
    id: "siesta",
    name: "Siesta.sh",
    project: "Deploy & chill",
    description:
      "Del primer commit a una demo desplegada, sin salir del terminal.",
    track: "DevTools",
    members: 3,
    primary: "codex",
    secondary: "cursor",
    color: "#35858a",
  },
  {
    id: "paella",
    name: "Paella Intelligence",
    project: "Barrio",
    description:
      "Agentes que conectan iniciativas locales con las personas que las necesitan.",
    track: "Impacto",
    members: 4,
    primary: "cursor",
    secondary: "claude-code",
    color: "#1e3958",
  },
  {
    id: "gitana",
    name: "Git Happens",
    project: "Reviewmate",
    description:
      "Revisiones de código que explican el contexto y proponen el siguiente paso.",
    track: "DevTools",
    members: 4,
    primary: "claude-code",
    secondary: "opencode",
    color: "#8b6b9f",
  },
  {
    id: "context",
    name: "Context Cowboys",
    project: "Memory Lane",
    description:
      "Memoria compartida para equipos de agentes que trabajan en tareas largas.",
    track: "Agents",
    members: 3,
    primary: "opencode",
    secondary: "codex",
    color: "#a67516",
  },
  {
    id: "churros",
    name: "Churros & Code",
    project: "Aula abierta",
    description: "Un tutor que adapta sus explicaciones a cada estudiante.",
    track: "Impacto",
    members: 4,
    primary: "cursor",
    secondary: "cline",
    color: "#677558",
  },
  {
    id: "localhost",
    name: "Localhost Heroes",
    project: "Local First",
    description:
      "Herramientas de desarrollo que siguen funcionando sin conexión.",
    track: "DevTools",
    members: 3,
    primary: "codex",
    secondary: "copilot",
    color: "#35858a",
  },
  {
    id: "prompt",
    name: "Prompt Fiction",
    project: "Scene",
    description:
      "Un estudio creativo para convertir una idea en una historia interactiva.",
    track: "Agents",
    members: 4,
    primary: "claude-code",
    secondary: "cursor",
    color: "#d96b2a",
  },
  {
    id: "cache",
    name: "Caché con leche",
    project: "Green Route",
    description:
      "Rutas compartidas para reducir los desplazamientos de una comunidad.",
    track: "Impacto",
    members: 3,
    primary: "cline",
    secondary: "opencode",
    color: "#a67516",
  },
  {
    id: "merge",
    name: "Merge y punto",
    project: "Shipyard",
    description:
      "Un copiloto para mantener las entregas de equipos pequeños en movimiento.",
    track: "DevTools",
    members: 4,
    primary: "copilot",
    secondary: "codex",
    color: "#677558",
  },
  {
    id: "neural",
    name: "Neural Nomads",
    project: "Compass",
    description:
      "Agentes que investigan y preparan decisiones con fuentes trazables.",
    track: "Agents",
    members: 3,
    primary: "opencode",
    secondary: "claude-code",
    color: "#8b6b9f",
  },
  {
    id: "404",
    name: "404 Sleep Not Found",
    project: "Cuida",
    description:
      "Una ayuda cotidiana para coordinar las tareas de cuidado en familia.",
    track: "Impacto",
    members: 4,
    primary: "cursor",
    secondary: "copilot",
    color: "#1e3958",
  },
];

export interface Sample {
  teamId: string;
  harness: HarnessId;
  bucket: number;
  tokens: number;
  commits: number;
  pullRequests: number;
  sessions: number;
  cachedTokens: number;
}

// Deterministic, fictional event telemetry. No participant data or API calls.
const BASE_SAMPLES: Sample[] = TEAMS.flatMap((team, teamIndex) =>
  Array.from({ length: 24 }, (_, bucket) =>
    [team.primary, team.secondary].map((harness, toolIndex) => {
      const phaseIndex = bucket < 4 ? 0 : bucket < 18 ? 1 : 2;
      const rhythms = [
        [0.65, 1.05, 1.8],
        [1.25, 1, 0.55],
        [0.9, 1.05, 1.1],
      ];
      const wave =
        (0.65 + ((bucket * 7 + teamIndex * 3) % 9) / 12) *
        rhythms[teamIndex % rhythms.length][phaseIndex];
      const share = toolIndex === 0 ? 0.76 : 0.24;
      const tokens =
        Math.round(((15 - teamIndex) * 25_000 * wave * share) / 100) * 100;
      const commits = Math.max(
        0,
        Math.round(
          (4 + ((teamIndex * 5 + bucket * 3) % 15)) *
            share *
            wave *
            (0.75 + teamIndex / 22),
        ),
      );
      return {
        teamId: team.id,
        harness,
        bucket,
        tokens,
        commits,
        pullRequests: Math.floor(commits / (3 + (teamIndex % 3))),
        sessions: Math.max(1, Math.round((5 + (bucket % 6)) * share * wave)),
        cachedTokens: Math.round(tokens * (0.28 + (teamIndex % 5) * 0.09)),
      };
    }),
  ).flat(),
);

export function getSamples(tick: number): Sample[] {
  return BASE_SAMPLES.map((sample, index) => {
    if (sample.bucket !== 23) return sample;
    const updates = Math.floor((tick + (index % 12)) / 12);
    const tokens = updates * (1_200 + (index % 7) * 400);
    return {
      ...sample,
      tokens: sample.tokens + tokens,
      cachedTokens: sample.cachedTokens + Math.round(tokens * 0.4),
      commits: sample.commits + updates,
      sessions: sample.sessions + updates,
    };
  });
}

export function filterSamples(
  samples: Sample[],
  period: Period,
  track: string,
): Sample[] {
  const buckets = PERIODS.find((item) => item.id === period)?.buckets ?? 24;
  const ids = new Set(
    TEAMS.filter((team) => track === "all" || team.track === track).map(
      (team) => team.id,
    ),
  );
  return samples.filter(
    (sample) => sample.bucket >= 24 - buckets && ids.has(sample.teamId),
  );
}

export interface Totals {
  tokens: number;
  commits: number;
  pullRequests: number;
  sessions: number;
  cachedTokens: number;
}

export function sumSamples(samples: Sample[]): Totals {
  const totals: Totals = {
    tokens: 0,
    commits: 0,
    pullRequests: 0,
    sessions: 0,
    cachedTokens: 0,
  };
  for (const sample of samples) {
    totals.tokens += sample.tokens;
    totals.commits += sample.commits;
    totals.pullRequests += sample.pullRequests;
    totals.sessions += sample.sessions;
    totals.cachedTokens += sample.cachedTokens;
  }
  return totals;
}

export function teamRows(samples: Sample[]) {
  return TEAMS.filter((team) =>
    samples.some((sample) => sample.teamId === team.id),
  ).map((team) => ({
    ...team,
    ...sumSamples(samples.filter((sample) => sample.teamId === team.id)),
  }));
}
export type TeamRow = ReturnType<typeof teamRows>[number];

export function harnessRows(samples: Sample[]) {
  return HARNESSES.map((harness) => {
    const rows = samples.filter((sample) => sample.harness === harness.id);
    return {
      ...harness,
      ...sumSamples(rows),
      teams: new Set(rows.map((sample) => sample.teamId)).size,
    };
  });
}
export type HarnessRow = ReturnType<typeof harnessRows>[number];

export function timeLabel(bucket: number): string {
  return `${String(9 + Math.floor(bucket / 2)).padStart(2, "0")}:${bucket % 2 ? "30" : "00"}`;
}

export function compact(value: number): string {
  if (value >= 1_000_000)
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value / 1_000_000)} M`;
  if (value >= 1_000)
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value / 1_000)} k`;
  return String(value);
}
export function number(value: number): string {
  return new Intl.NumberFormat("es-ES").format(Math.round(value));
}
export function percent(value: number, total: number): string {
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(total ? (value / total) * 100 : 0)} %`;
}
