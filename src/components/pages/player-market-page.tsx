"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { PlayerMarketCompanySummary } from "../../lib/player-market-service";
import type {
  PublicPlayerMarketProfile,
  PublicPlayerMarketTransfer,
} from "../../lib/player-market-types";

type Audience = "startup" | "builder" | "live";
type SponsorshipType = "built_with" | "equipped" | "team_sponsor";
type CompensationType = "experience" | "money" | "open" | "product";
type Modal =
  | "company-access"
  | "offer"
  | "player-access"
  | "profile"
  | "sent"
  | null;

interface PlayerMarketPageProps {
  company: PlayerMarketCompanySummary | null;
  profiles: PublicPlayerMarketProfile[];
  transfers: PublicPlayerMarketTransfer[];
}

interface Transfer {
  brand: string;
  color: string;
  id: string;
  initials: string;
  player: string;
  reward: string;
  time: string;
  type: SponsorshipType;
}

interface Player {
  bio: string;
  city: string;
  color: string;
  id: string;
  initials: string;
  lore: string;
  name: string;
  photo: string | null;
  rating: number;
  role: string;
  status: "Libre" | "No disponible";
  tags: string[];
}

const PLAYER_COLORS = ["teal", "orange", "red", "navy", "gold"] as const;
const DEFAULT_CARD_RATING = 92;
const WHITESPACE_RE = /\s+/u;

const sponsorshipModes: Array<{
  brand: string;
  builder: string;
  icon: string;
  id: SponsorshipType;
  name: string;
  short: string;
}> = [
  {
    brand: "Una camiseta, sudadera, pegatinas o hardware.",
    builder: "Lo usa y lo muestra durante el evento.",
    icon: "01",
    id: "equipped",
    name: "Equipado por",
    short: "La marca se lleva puesta.",
  },
  {
    brand: "Aporta API, créditos, soporte o hardware.",
    builder: "Lo prueba si encaja y cuenta cómo lo usó.",
    icon: "02",
    id: "built_with",
    name: "Construido con",
    short: "La marca entra en el proyecto.",
  },
  {
    brand: "Cubre comida, viaje, material o premio.",
    builder: "El equipo la reconoce como su sponsor.",
    icon: "03",
    id: "team_sponsor",
    name: "Team sponsor",
    short: "La marca ficha al equipo entero.",
  },
];

const compensationOptions: Array<{
  hint: string;
  id: CompensationType;
  name: string;
}> = [
  { hint: "Una cantidad cerrada", id: "money", name: "Dinero" },
  { hint: "Créditos, hardware o kit", id: "product", name: "Producto" },
  { hint: "Comida, entradas o viaje", id: "experience", name: "Plan" },
  { hint: "Lo habláis entre vosotros", id: "open", name: "Trato libre" },
];

const deliverables: Record<SponsorshipType, string[]> = {
  built_with: [
    "Usar una API o herramienta",
    "Probar hardware",
    "Integrar el producto",
    "Dar feedback privado",
  ],
  equipped: [
    "Camiseta o sudadera",
    "Pegatina en portátil",
    "Gorra o accesorio",
    "Producto visible",
  ],
  team_sponsor: [
    "Comida del equipo",
    "Viaje o alojamiento",
    "Material del equipo",
    "Sponsor general",
  ],
};

const rewardTypeByCompensation: Record<CompensationType, string[]> = {
  experience: ["food"],
  money: ["money"],
  open: ["custom"],
  product: ["credits", "hardware", "merch"],
};

const modeName = (type: SponsorshipType): string =>
  sponsorshipModes.find((mode) => mode.id === type)?.name ?? "Fichaje";

function toPlayer(profile: PublicPlayerMarketProfile, index: number): Player {
  return {
    bio: profile.bio ?? "Builder verificado por HackSpain.",
    city: profile.city,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length] ?? "teal",
    id: profile.slug,
    initials: profile.initials,
    lore: profile.lore,
    name: profile.displayName,
    photo: profile.photo,
    rating: DEFAULT_CARD_RATING,
    role: profile.role,
    status: profile.isAvailable ? "Libre" : "No disponible",
    tags: profile.skills,
  };
}

function toTransfer(
  transfer: PublicPlayerMarketTransfer,
  index: number
): Transfer {
  const initials = transfer.playerName
    .split(WHITESPACE_RE)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return {
    brand: transfer.companyName,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length] ?? "teal",
    id: transfer.id,
    initials,
    player: transfer.playerName,
    reward: transfer.rewardSummary,
    time: new Date(transfer.acceptedAt).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
    type: transfer.sponsorshipType as SponsorshipType,
  };
}

function PlayerCard({
  player,
  onOpen,
}: {
  player: Player;
  onOpen: (player: Player) => void;
}) {
  return (
    <article className={`player-card color-${player.color}`}>
      <button
        aria-label={`Abrir ficha de ${player.name}`}
        className="card-hitbox"
        onClick={() => onOpen(player)}
        type="button"
      />
      <div className="card-topline">
        <span>HS26 · {player.id.slice(0, 3).toUpperCase()}</span>
        <span
          className={`status status-${player.status === "Libre" ? "free" : "talking"}`}
        >
          {player.status}
        </span>
      </div>
      <div className="mini-rating">
        <strong>{player.rating}</strong>
        <span>BUILD</span>
      </div>
      <div aria-hidden="true" className="avatar">
        {player.photo ? (
          <img alt="" height="124" src={player.photo} width="124" />
        ) : (
          <span>{player.initials}</span>
        )}
      </div>
      <div className="card-content">
        <p className="card-track">{player.city}</p>
        <h3>{player.name}</h3>
        <p className="role">{player.role}</p>
        <div className="tag-row">
          {player.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="card-price">
          <span>ABIERTO A</span>
          <strong>OFERTAS</strong>
        </div>
      </div>
    </article>
  );
}

function SponsorshipModes({
  audience,
  selectedMode,
  onSelect,
}: {
  audience: Exclude<Audience, "live">;
  selectedMode: SponsorshipType;
  onSelect: (mode: SponsorshipType) => void;
}) {
  return (
    <section className="modes-section" id="formats">
      <div className="section-heading">
        <div>
          <p className="eyebrow">TRES FORMAS DE FICHAR</p>
          <h2>¿QUÉ SIGNIFICA PATROCINAR?</h2>
          <p>
            Primero elegís la relación. Después acordáis la recompensa: dinero,
            producto, un plan o cualquier trato que os represente.
          </p>
        </div>
        <span className="demo-label">SIN LETRA PEQUEÑA</span>
      </div>
      <div className="modes-grid">
        {sponsorshipModes.map((mode) => (
          <button
            className={`mode-card ${selectedMode === mode.id ? "selected" : ""}`}
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            type="button"
          >
            <span className="mode-number">{mode.icon}</span>
            <h3>{mode.name}</h3>
            <p className="mode-short">{mode.short}</p>
            <div className="mode-exchange">
              <span>
                <b>MARCA</b>
                {mode.brand}
              </span>
              <span>
                <b>BUILDER</b>
                {mode.builder}
              </span>
            </div>
            <strong>
              {audience === "startup"
                ? "Elegir este fichaje →"
                : "Esto sí me representa →"}
            </strong>
          </button>
        ))}
      </div>
      <div className="wild-deal">
        <span>✦ TRATO LIBRE</span>
        <p>
          <strong>¿Dos pintxos y una morcilla?</strong> También vale. La
          compensación puede ser dinero, créditos, hardware, comida o algo
          inventado entre vosotros. Lo importante es escribirlo y que ambas
          partes digan que sí.
        </p>
      </div>
    </section>
  );
}

function LiveMarket({
  transfers,
  onBrowse,
}: {
  transfers: Transfer[];
  onBrowse: () => void;
}) {
  const latest = transfers[0];
  return (
    <div className="live-page">
      <section className="live-hero">
        <div>
          <p className="eyebrow">
            <span className="live-dot" /> MERCADO EN DIRECTO
          </p>
          <h1>
            FICHAJES
            <br />
            <em>CONFIRMADOS.</em>
          </h1>
          <p>
            Cada acuerdo aparece aquí cuando el builder lo acepta. No importa si
            se paga con euros, APIs o pintxos.
          </p>
          <button className="primary-cta" onClick={onBrowse} type="button">
            Explorar plantilla <span>→</span>
          </button>
        </div>
        {latest ? (
          <article className={`latest-transfer color-${latest.color}`}>
            <div className="latest-kicker">
              <span>ÚLTIMA HORA</span>
              <time>{latest.time}</time>
            </div>
            <div className="transfer-versus">
              <div className="transfer-avatar">{latest.initials}</div>
              <span>×</span>
              <div className="brand-crest">
                {latest.brand.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <p>{modeName(latest.type)}</p>
            <h2>
              {latest.player}
              <br />
              <span>ficha por</span>
              <br />
              {latest.brand}
            </h2>
            <strong>{latest.reward}</strong>
          </article>
        ) : (
          <article className="latest-transfer">
            <div className="latest-kicker">
              <span>VENTANA ABIERTA</span>
            </div>
            <div className="transfer-versus">
              <div className="transfer-avatar">?</div>
              <span>×</span>
              <div className="brand-crest">?</div>
            </div>
            <p>PRIMER FICHAJE</p>
            <h2>
              EL MERCADO
              <br />
              <span>espera el</span>
              <br />
              PRIMER SÍ
            </h2>
            <strong>Aparecerá aquí automáticamente</strong>
          </article>
        )}
      </section>

      <section className="live-board">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MARCADOR DE MERCADO</p>
            <h2>ÚLTIMOS FICHAJES</h2>
            <p>
              El acuerdo más reciente sube automáticamente a primera posición.
            </p>
          </div>
          <span className="demo-label">
            <i className="live-dot" /> LIVE
          </span>
        </div>
        <div aria-live="polite" className="transfer-feed">
          {transfers.map((transfer, index) => (
            <article className="transfer-row" key={transfer.id}>
              <span className="transfer-position">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={`feed-avatar color-${transfer.color}`}>
                {transfer.initials}
              </div>
              <div className="transfer-main">
                <p>
                  <strong>{transfer.player}</strong>
                  <span>×</span>
                  <strong>{transfer.brand}</strong>
                </p>
                <small>{modeName(transfer.type)}</small>
              </div>
              <div className="transfer-reward">
                <span>ACUERDO</span>
                <strong>{transfer.reward}</strong>
              </div>
              <time>{transfer.time}</time>
            </article>
          ))}
        </div>
        {transfers.length === 0 && (
          <p className="live-note">
            Los acuerdos aparecerán aquí en cuanto un builder acepte una oferta.
          </p>
        )}
      </section>
    </div>
  );
}

export function PlayerMarketPage({
  company,
  profiles,
  transfers: publicTransfers,
}: PlayerMarketPageProps) {
  const players = useMemo(() => profiles.map(toPlayer), [profiles]);
  const transfers = useMemo(
    () => publicTransfers.map(toTransfer),
    [publicTransfers]
  );
  const [audience, setAudience] = useState<Audience>("startup");
  const [selected, setSelected] = useState<Player | null>(null);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [budget, setBudget] = useState(180);
  const [sponsorshipType, setSponsorshipType] =
    useState<SponsorshipType>("equipped");
  const [compensationType, setCompensationType] =
    useState<CompensationType>("money");
  const [customReward, setCustomReward] = useState(
    "2 pintxos y una morcilla de Burgos"
  );
  const [toast, setToast] = useState("");
  const [accessSent, setAccessSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedAudience = params.get("view");
    if (
      requestedAudience === "builder" ||
      requestedAudience === "startup" ||
      requestedAudience === "live"
    ) {
      setAudience(requestedAudience);
    }
    const playerId = params.get("player");
    const player = players.find((item) => item.id === playerId);
    if (player) {
      setSelected(player);
      setModal(params.get("offer") === "1" && company ? "offer" : "profile");
    }
  }, [company, players]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredPlayers = useMemo(
    () =>
      players.filter((player) => {
        const search = query.trim().toLowerCase();
        return (
          !search ||
          `${player.name} ${player.role} ${player.city} ${player.tags.join(" ")}`
            .toLowerCase()
            .includes(search)
        );
      }),
    [players, query]
  );

  const setView = (next: Audience) => {
    setAudience(next);
    setModal(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    url.searchParams.delete("player");
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openPlayer = (player: Player) => {
    setSelected(player);
    setModal("profile");
    const url = new URL(window.location.href);
    url.searchParams.set("view", audience);
    url.searchParams.set("player", player.id);
    window.history.replaceState({}, "", url);
  };

  const closeModal = () => {
    setModal(null);
    setAccessSent(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("player");
    url.searchParams.delete("offer");
    window.history.replaceState({}, "", url);
  };

  const copyLink = async (view: Audience, player?: Player) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (player) {
      url.searchParams.set("player", player.id);
    } else {
      url.searchParams.delete("player");
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast(
        player
          ? `Enlace de ${player.name} copiado`
          : "Enlace para startups copiado"
      );
    } catch {
      setToast("Enlace preparado en la barra del navegador");
      window.history.replaceState({}, "", url);
    }
    window.setTimeout(() => setToast(""), 2600);
  };

  const startOffer = () => {
    if (!selected) {
      return;
    }
    setBudget(180);
    setAccessSent(false);
    setModal(company ? "offer" : "company-access");
  };

  const chooseMode = (mode: SponsorshipType) => {
    setSponsorshipType(mode);
    document.getElementById("roster")?.scrollIntoView({ behavior: "smooth" });
    setToast(`${modeName(mode)} seleccionado`);
    window.setTimeout(() => setToast(""), 2200);
  };

  const rewardLabel =
    compensationType === "money" ? `${budget} €` : customReward;

  const submitAccess = async (
    event: FormEvent<HTMLFormElement>,
    accessAudience: "company" | "player"
  ) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const returnTo =
      accessAudience === "player"
        ? "/player-market/manage"
        : `/player-market?view=startup${selected ? `&player=${encodeURIComponent(selected.id)}&offer=1` : ""}`;
    const payload =
      accessAudience === "player"
        ? { audience: "player", email: form.get("email"), returnTo }
        : {
            audience: "company",
            companyName: form.get("companyName"),
            email: form.get("email"),
            inviteToken: form.get("inviteToken") || undefined,
            returnTo,
          };
    try {
      const response = await fetch("/api/player-market/access/request", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { debugUrl?: string };
      if (!response.ok) {
        setToast("Revisa los datos e inténtalo de nuevo");
      } else if (result.debugUrl) {
        window.location.assign(result.debugUrl);
      } else {
        setAccessSent(true);
      }
    } catch {
      setToast("No se pudo solicitar el acceso. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(selected && company)) {
      setModal("company-access");
      return;
    }
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const selectedDeliverable = String(form.get("deliverable") ?? "");
    const conditions = String(form.get("conditions") ?? "");
    try {
      const response = await fetch("/api/player-market/offers", {
        body: JSON.stringify({
          deliverables: `${selectedDeliverable}. ${conditions}`,
          profileSlug: selected.id,
          rewardSummary: rewardLabel,
          rewardTypes: rewardTypeByCompensation[compensationType],
          sponsorshipType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (response.status === 401) {
        setModal("company-access");
      } else if (response.ok) {
        setModal("sent");
      } else {
        setToast("No se pudo enviar la oferta. Revisa los datos.");
      }
    } catch {
      setToast("No se pudo enviar la oferta. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToRoster = () =>
    document.getElementById("roster")?.scrollIntoView({ behavior: "smooth" });
  const featuredPlayer = players[0];

  return (
    <main className="site-shell">
      <header className="topbar">
        <button
          aria-label="Volver al inicio"
          className="wordmark"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
        >
          <img alt="" height="46" src="/hs-icon.png" width="46" />
          <span>
            <strong>PLAYER</strong> MARKET
          </span>
        </button>
        <div className="header-actions">
          <button
            className="share-button"
            onClick={() => copyLink("startup")}
            type="button"
          >
            <span>↗</span> Compartir escaparate
          </button>
          <nav aria-label="Cambiar vista" className="audience-switch">
            <button
              className={audience === "startup" ? "active" : ""}
              onClick={() => setView("startup")}
              type="button"
            >
              Soy startup
            </button>
            <button
              className={audience === "builder" ? "active" : ""}
              onClick={() => setView("builder")}
              type="button"
            >
              Soy builder
            </button>
            <button
              className={`live-tab ${audience === "live" ? "active" : ""}`}
              onClick={() => setView("live")}
              type="button"
            >
              <i className="live-dot" /> Fichajes live
            </button>
          </nav>
        </div>
      </header>

      {audience === "live" ? (
        <LiveMarket onBrowse={() => setView("startup")} transfers={transfers} />
      ) : (
        <>
          <section className={`hero hero-${audience}`} id="top">
            <div aria-hidden="true" className="hero-grid" />
            <div className="hero-copy">
              <div className="hero-kicker">
                <span>HACKSPAIN 2026</span>
                <span>18—20 SEP · MADRID</span>
              </div>
              <p className="eyebrow">MERCADO DE FICHAJES · TEMPORADA 01</p>
              <h1>
                {audience === "startup" ? (
                  <>
                    FICHA A LOS <em>BUILDERS</em> DEL FUTURO.
                  </>
                ) : (
                  <>
                    ENCUENTRA TU FICHA. <em>ELIGE QUIÉN TE PATROCINA.</em>
                  </>
                )}
              </h1>
              <p className="hero-lede">
                {audience === "startup"
                  ? "Patrocina talento verificado durante las 36 horas de HackSpain. Elige perfil, lanza una oferta y haz que tu marca juegue dentro del hackathon."
                  : "Una startup quiere jugar en tu equipo. Descubre tu ficha, revisa las condiciones y tú decides qué marca puede acompañarte durante HackSpain."}
              </p>
              <div className="hero-actions">
                <button
                  className="primary-cta"
                  onClick={
                    audience === "startup"
                      ? scrollToRoster
                      : () => setModal("player-access")
                  }
                  type="button"
                >
                  {audience === "startup"
                    ? "Explorar plantilla"
                    : "Acceder a mi ficha"}
                  <span>↓</span>
                </button>
                {audience === "builder" && (
                  <button
                    className="text-cta"
                    onClick={scrollToRoster}
                    type="button"
                  >
                    Ver fichas publicadas <span>→</span>
                  </button>
                )}
              </div>
              <div className="hero-metrics">
                <div>
                  <strong>{players.length}</strong>
                  <span>builders publicados</span>
                </div>
                <div>
                  <strong>36H</strong>
                  <span>de presencia</span>
                </div>
                <div>
                  <strong>100%</strong>
                  <span>control del builder</span>
                </div>
              </div>
            </div>

            {featuredPlayer ? (
              <button
                aria-label={`Abrir ficha destacada de ${featuredPlayer.name}`}
                className="featured-card"
                onClick={() => openPlayer(featuredPlayer)}
                type="button"
              >
                <div className="card-rarity">FICHA DESTACADA · #01</div>
                <div className="featured-stripes" />
                <div aria-hidden="true" className="player-portrait">
                  <span>{featuredPlayer.initials}</span>
                </div>
                <div className="player-rating">
                  <strong>{featuredPlayer.rating}</strong>
                  <span>BUILD</span>
                </div>
                <div className="featured-copy">
                  <p>
                    {featuredPlayer.role} · {featuredPlayer.city}
                  </p>
                  <h2>{featuredPlayer.name}</h2>
                  <div className="skill-row">
                    {featuredPlayer.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <footer>
                  <span>DISPONIBLE</span>
                  <strong>FICHAR</strong>
                </footer>
              </button>
            ) : (
              <div className="featured-card">
                <div className="card-rarity">FICHA DESTACADA · #01</div>
                <div className="featured-stripes" />
                <div aria-hidden="true" className="player-portrait">
                  <span>?</span>
                </div>
                <div className="player-rating">
                  <strong>92</strong>
                  <span>BUILD</span>
                </div>
                <div className="featured-copy">
                  <p>PLAYER MARKET · HACKSPAIN</p>
                  <h2>
                    PRIMERA
                    <br />
                    FICHA
                  </h2>
                  <div className="skill-row">
                    <span>PRÓXIMAMENTE</span>
                  </div>
                </div>
                <footer>
                  <span>VENTANA ABIERTA</span>
                  <strong>HS26</strong>
                </footer>
              </div>
            )}
          </section>

          <section aria-label="Información del mercado" className="ticker">
            <div>VENTANA DE FICHAJES ABIERTA</div>
            <span>✦</span>
            <div>PERFILES VERIFICADOS</div>
            <span>✦</span>
            <div>EL BUILDER SIEMPRE DECIDE</div>
            <span>✦</span>
            <div>HACKSPAIN · MADRID 26</div>
          </section>

          <SponsorshipModes
            audience={audience}
            onSelect={chooseMode}
            selectedMode={sponsorshipType}
          />

          <section className="roster-section" id="roster">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {audience === "startup" ? "SCOUTING ROOM" : "VESTUARIO"}
                </p>
                <h2>
                  {audience === "startup"
                    ? "LA PLANTILLA"
                    : "ENCUENTRA TU FICHA"}
                </h2>
                <p>
                  {audience === "startup"
                    ? "Perfiles publicados por participantes verificados de HackSpain."
                    : "Tu ficha solo aparece cuando la revisas y decides publicarla."}
                </p>
              </div>
              <span className="demo-label">PERFILES VERIFICADOS</span>
            </div>

            <div className="filters">
              <label>
                <span>Buscar</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    audience === "startup"
                      ? "Nombre, skill o rol…"
                      : "Escribe tu nombre…"
                  }
                  value={query}
                />
              </label>
              <div className="results-count">
                <strong>{filteredPlayers.length}</strong>
                <span>fichas</span>
              </div>
            </div>

            <div className="players-grid">
              {filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  onOpen={openPlayer}
                  player={player}
                />
              ))}
            </div>
            {filteredPlayers.length === 0 && (
              <div className="empty-state">
                <strong>No aparece esa ficha.</strong>
                <span>
                  Solo se muestran perfiles que sus propietarios han decidido
                  publicar.
                </span>
                <button onClick={() => setQuery("")} type="button">
                  Ver todas
                </button>
              </div>
            )}
          </section>

          <section className="how-section">
            <div className="section-heading inverse">
              <div>
                <p className="eyebrow">REGLAS DEL JUEGO</p>
                <h2>DOS CLICS. CERO SORPRESAS.</h2>
              </div>
            </div>
            <div className="steps-grid">
              {(audience === "startup"
                ? [
                    [
                      "01",
                      "HAZ SCOUTING",
                      "Elige a la persona por perfil, skills y afinidad. No por seguidores.",
                    ],
                    [
                      "02",
                      "MONTA EL TRATO",
                      "Elige el tipo de patrocinio y ofrece dinero, producto, un plan o un pacto libre.",
                    ],
                    [
                      "03",
                      "ESPERA EL SÍ",
                      "Nada se activa hasta que el builder acepta el fichaje.",
                    ],
                  ]
                : [
                    [
                      "01",
                      "RECONÓCETE",
                      "Revisa tu ficha, edita el lore y decide qué skills te representan.",
                    ],
                    [
                      "02",
                      "LEE EL CONTRATO",
                      "Verás marca, importe y compromisos antes de responder.",
                    ],
                    [
                      "03",
                      "TÚ FICHAS A LA MARCA",
                      "Acepta, rechaza o pide cambios sin presión ni letra pequeña.",
                    ],
                  ]
              ).map(([number, title, copy]) => (
                <article key={number}>
                  <strong>{number}</strong>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="final-cta">
            <p className="eyebrow">PILOTO · HACKSPAIN 2026</p>
            <h2>
              {audience === "startup"
                ? "TU PRÓXIMO FICHAJE ESTÁ AQUÍ."
                : "TU FICHA. TUS REGLAS."}
            </h2>
            <p>
              {audience === "startup"
                ? "Comparte este escaparate con tu equipo y lanza una propuesta de prueba."
                : "Abre tu ficha desde el enlace personal y decide si la propuesta encaja contigo."}
            </p>
            <button
              className="primary-cta"
              onClick={
                audience === "startup"
                  ? () => copyLink("startup")
                  : () => setModal("player-access")
              }
              type="button"
            >
              {audience === "startup"
                ? "Copiar link para startups"
                : "Acceder a mi perfil"}
              <span>↗</span>
            </button>
          </section>
        </>
      )}

      <footer className="site-footer">
        <div className="wordmark footer-mark">
          <span className="wordmark-text">
            <strong>PLAYER</strong> MARKET
          </span>
        </div>
        <p>
          Piloto de patrocinios entre builders y marcas durante HackSpain 2026.
        </p>
        <a href="/">hackspain.com ↗</a>
      </footer>

      {modal && (
        <div className="modal-backdrop">
          <section
            aria-labelledby="modal-title"
            aria-modal="true"
            className="modal-card"
            role="dialog"
          >
            <button
              aria-label="Cerrar"
              className="modal-close"
              onClick={closeModal}
              type="button"
            >
              ×
            </button>

            {modal === "profile" && selected && (
              <>
                <div className={`profile-hero color-${selected.color}`}>
                  <div className="profile-rating">
                    <strong>{selected.rating}</strong>
                    <span>BUILD</span>
                  </div>
                  <div className="profile-avatar">
                    {selected.photo ? (
                      <img
                        alt={`Retrato de ${selected.name}`}
                        height="155"
                        src={selected.photo}
                        width="155"
                      />
                    ) : (
                      <span>{selected.initials}</span>
                    )}
                  </div>
                  <div>
                    <p>
                      {selected.role} · {selected.city}
                    </p>
                    <h2 id="modal-title">{selected.name}</h2>
                    <span>{selected.tags.join(" · ")}</span>
                  </div>
                </div>
                <div className="modal-body">
                  <div className="profile-lore">
                    <span>LORE DE JUGADOR</span>
                    <p>“{selected.lore}”</p>
                  </div>
                  <div className="profile-stats">
                    <div>
                      <span>BUILD</span>
                      <strong>{selected.rating}</strong>
                    </div>
                    <div>
                      <span>SHIP</span>
                      <strong>{Math.min(99, selected.rating + 3)}</strong>
                    </div>
                    <div>
                      <span>TEAM</span>
                      <strong>{Math.max(80, selected.rating - 2)}</strong>
                    </div>
                  </div>
                  <p className="profile-bio">{selected.bio}</p>
                  <div className="tag-row dark">
                    {selected.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  {audience === "builder" ? (
                    <div className="builder-panel">
                      <div className="identity-line">
                        <span>¿ERES TÚ?</span>
                        <button
                          onClick={() => setModal("player-access")}
                          type="button"
                        >
                          Acceder a mi ficha
                        </button>
                      </div>
                      <div className="no-offer">
                        <strong>Tu perfil, bajo tu control.</strong>
                        <span>
                          Identifícate para editarlo, publicarlo u ocultarlo y
                          gestionar tus ofertas.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="startup-panel">
                      <div>
                        <span>ESTADO</span>
                        <strong>{selected.status}</strong>
                      </div>
                      <button
                        className="primary-cta compact"
                        onClick={startOffer}
                        type="button"
                      >
                        Lanzar oferta <span>→</span>
                      </button>
                      <button
                        className="secondary-cta"
                        onClick={() => copyLink("startup", selected)}
                        type="button"
                      >
                        Compartir ficha
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {modal === "offer" &&
              audience === "startup" &&
              selected &&
              company && (
                <form className="modal-body offer-form" onSubmit={submitOffer}>
                  <p className="eyebrow">
                    OFERTA PARA {selected.name.toUpperCase()}
                  </p>
                  <h2 id="modal-title">PREPARA EL FICHAJE</h2>
                  <p>
                    El builder verá qué relación propones, qué recibe y qué
                    esperas a cambio.
                  </p>
                  <label>
                    <span>Startup</span>
                    <input readOnly value={company.name} />
                  </label>
                  <fieldset className="choice-fieldset">
                    <legend>Tipo de fichaje</legend>
                    <div className="mode-selector">
                      {sponsorshipModes.map((mode) => (
                        <button
                          aria-pressed={sponsorshipType === mode.id}
                          className={
                            sponsorshipType === mode.id ? "selected" : ""
                          }
                          key={mode.id}
                          onClick={() => setSponsorshipType(mode.id)}
                          type="button"
                        >
                          <b>{mode.name}</b>
                          <span>{mode.short}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    <span>Qué proponéis</span>
                    <select key={sponsorshipType} name="deliverable">
                      {deliverables[sponsorshipType].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <fieldset className="choice-fieldset">
                    <legend>Qué recibe</legend>
                    <div className="reward-selector">
                      {compensationOptions.map((option) => (
                        <button
                          aria-pressed={compensationType === option.id}
                          className={
                            compensationType === option.id ? "selected" : ""
                          }
                          key={option.id}
                          onClick={() => setCompensationType(option.id)}
                          type="button"
                        >
                          <b>{option.name}</b>
                          <span>{option.hint}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="reward-input">
                    {compensationType === "money" ? (
                      <label>
                        <span>Cantidad (€)</span>
                        <input
                          min="1"
                          onChange={(event) =>
                            setBudget(Number(event.target.value))
                          }
                          required
                          type="number"
                          value={budget}
                        />
                      </label>
                    ) : (
                      <label>
                        <span>Escribe el trato tal cual</span>
                        <input
                          onChange={(event) =>
                            setCustomReward(event.target.value)
                          }
                          placeholder="Ej. dos pintxos y una morcilla de Burgos"
                          required
                          value={customReward}
                        />
                      </label>
                    )}
                  </div>
                  <label>
                    <span>Condiciones y por qué encaja</span>
                    <textarea
                      maxLength={700}
                      minLength={10}
                      name="conditions"
                      placeholder="Qué esperáis exactamente y por qué os gustaría ficharle…"
                      required
                      rows={4}
                    />
                  </label>
                  <label className="check-line">
                    <input required type="checkbox" />
                    <span>
                      Acepto que el builder pueda aceptar, rechazar o proponer
                      otro trato.
                    </span>
                  </label>
                  <button
                    className="primary-cta full"
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting
                      ? "Enviando…"
                      : `Enviar propuesta · ${rewardLabel}`}{" "}
                    <span>→</span>
                  </button>
                  <small className="form-note">
                    No se procesa ningún pago. El acuerdo solo se activa si el
                    builder acepta.
                  </small>
                </form>
              )}

            {modal === "sent" && selected && (
              <div className="success-view modal-body">
                <div className="success-mark">✓</div>
                <p className="eyebrow">OFERTA REGISTRADA</p>
                <h2 id="modal-title">FICHAJE ENVIADO.</h2>
                <p>
                  {selected.name} recibirá una ficha clara con el tipo de
                  patrocinio, el trato y las condiciones. Nada se activa hasta
                  que acepte.
                </p>
                <div className="success-summary">
                  <span>
                    {modeName(sponsorshipType)} · {selected.name}
                  </span>
                  <strong>{rewardLabel}</strong>
                </div>
                <button
                  className="primary-cta full"
                  onClick={closeModal}
                  type="button"
                >
                  Volver a la plantilla
                </button>
              </div>
            )}

            {modal === "company-access" && (
              <div className="modal-body">
                {accessSent ? (
                  <div className="success-view">
                    <div className="success-mark">✉</div>
                    <p className="eyebrow">ENLACE ENVIADO</p>
                    <h2 id="modal-title">REVISA TU CORREO.</h2>
                    <p>
                      Si los datos son válidos, recibirás un enlace de un solo
                      uso para identificar a tu empresa y continuar la oferta.
                    </p>
                    <button
                      className="primary-cta full"
                      onClick={closeModal}
                      type="button"
                    >
                      Entendido
                    </button>
                  </div>
                ) : (
                  <form
                    className="offer-form"
                    onSubmit={(event) => submitAccess(event, "company")}
                  >
                    <p className="eyebrow">ACCESO PARA EMPRESAS</p>
                    <h2 id="modal-title">IDENTIFICA A TU EQUIPO.</h2>
                    <p>
                      Te enviaremos un enlace mágico. Para este piloto no
                      necesitas contraseña.
                    </p>
                    <label>
                      <span>Empresa</span>
                      <input
                        autoComplete="organization"
                        maxLength={100}
                        minLength={2}
                        name="companyName"
                        required
                      />
                    </label>
                    <label>
                      <span>Email corporativo</span>
                      <input
                        autoComplete="email"
                        name="email"
                        required
                        type="email"
                      />
                    </label>
                    <label>
                      <span>Invitación de HackSpain (opcional)</span>
                      <input
                        autoComplete="off"
                        maxLength={200}
                        name="inviteToken"
                      />
                    </label>
                    <button
                      className="primary-cta full"
                      disabled={submitting}
                      type="submit"
                    >
                      {submitting ? "Enviando…" : "Recibir enlace"}
                      <span>→</span>
                    </button>
                    <small className="form-note">
                      También puedes acceder con una invitación de HackSpain.
                    </small>
                  </form>
                )}
              </div>
            )}

            {modal === "player-access" && (
              <div className="modal-body">
                {accessSent ? (
                  <div className="success-view">
                    <div className="success-mark">✉</div>
                    <p className="eyebrow">ENLACE ENVIADO</p>
                    <h2 id="modal-title">REVISA TU CORREO.</h2>
                    <p>
                      Si tu plaza está confirmada, recibirás un enlace privado
                      para editar tu ficha y responder ofertas.
                    </p>
                    <button
                      className="primary-cta full"
                      onClick={closeModal}
                      type="button"
                    >
                      Entendido
                    </button>
                  </div>
                ) : (
                  <form
                    className="offer-form"
                    onSubmit={(event) => submitAccess(event, "player")}
                  >
                    <p className="eyebrow">ACCESO PARA BUILDERS</p>
                    <h2 id="modal-title">ENTRA EN TU VESTUARIO.</h2>
                    <p>
                      Usa el mismo email con el que confirmaste tu plaza en
                      HackSpain.
                    </p>
                    <label>
                      <span>Email</span>
                      <input
                        autoComplete="email"
                        name="email"
                        required
                        type="email"
                      />
                    </label>
                    <button
                      className="primary-cta full"
                      disabled={submitting}
                      type="submit"
                    >
                      {submitting ? "Enviando…" : "Recibir enlace privado"}
                      <span>→</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <div
        aria-live="polite"
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
      >
        {toast}
      </div>
    </main>
  );
}
