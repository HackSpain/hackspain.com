"use client";

import { useEffect, useMemo, useState } from "react";
import type { DirectoryParticipant } from "./types";
import "./participant-directory.css";

interface ParticipantDirectoryProps {
  participants: DirectoryParticipant[];
}

const CARD_COLORS = ["teal", "orange", "red", "navy", "gold"] as const;
const DEFAULT_CARD_SCORE = 92;
const WHITESPACE_RE = /\s+/u;

function initialsFor(name: string): string {
  return name
    .trim()
    .split(WHITESPACE_RE)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ParticipantPortrait({
  initials,
  name,
  photoUrl,
}: {
  initials: string;
  name: string;
  photoUrl?: string;
}) {
  if (photoUrl) {
    return (
      <img alt={`Retrato de ${name}`} height="180" src={photoUrl} width="180" />
    );
  }
  return <span aria-hidden="true">{initials}</span>;
}

function ParticipantCard({
  color,
  onOpen,
  participant,
}: {
  color: (typeof CARD_COLORS)[number];
  onOpen: (participant: DirectoryParticipant) => void;
  participant: DirectoryParticipant;
}) {
  const initials = initialsFor(participant.displayName);
  return (
    <article className={`pd-card pd-color-${color}`}>
      <button
        aria-label={`Abrir ficha de ${participant.displayName}`}
        className="pd-card-hitbox"
        onClick={() => onOpen(participant)}
        type="button"
      />
      <div className="pd-card-topline">
        <span>HS26 · {participant.id.slice(0, 3).toUpperCase()}</span>
        <span>PARTICIPANTE</span>
      </div>
      <div className="pd-card-score">
        <strong>{participant.cardScore ?? DEFAULT_CARD_SCORE}</strong>
        <span>BUILD</span>
      </div>
      <div className="pd-avatar">
        <ParticipantPortrait
          initials={initials}
          name={participant.displayName}
          photoUrl={participant.photoUrl}
        />
      </div>
      <div className="pd-card-content">
        <p>{participant.city}</p>
        <h3>{participant.displayName}</h3>
        <strong>{participant.role}</strong>
        <div className="pd-tags">
          {participant.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <div className="pd-card-footer">
          <span>VER FICHA</span>
          <strong>→</strong>
        </div>
      </div>
    </article>
  );
}

export function ParticipantDirectory({
  participants,
}: ParticipantDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectoryParticipant | null>(null);
  const filteredParticipants = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return participants;
    }
    return participants.filter((participant) =>
      `${participant.displayName} ${participant.role} ${participant.city} ${participant.skills.join(" ")}`
        .toLowerCase()
        .includes(search)
    );
  }, [participants, query]);
  const featured =
    participants.find((participant) => participant.featured) ?? participants[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("participant");
    if (requested) {
      setSelected(
        participants.find((participant) => participant.id === requested) ?? null
      );
    }
  }, [participants]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openParticipant = (participant: DirectoryParticipant) => {
    setSelected(participant);
    const url = new URL(window.location.href);
    url.searchParams.set("participant", participant.id);
    window.history.replaceState({}, "", url);
  };

  const closeParticipant = () => {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("participant");
    window.history.replaceState({}, "", url);
  };

  return (
    <main className="participant-directory">
      <header className="pd-topbar">
        <a className="pd-wordmark" href="/">
          <img alt="" height="46" src="/hs-icon.png" width="46" />
          <span>
            <strong>HACKSPAIN</strong> DIRECTORY
          </span>
        </a>
        <a className="pd-back" href="/">
          Volver a HackSpain ↗
        </a>
      </header>

      <section className="pd-hero">
        <div className="pd-grid" />
        <div className="pd-hero-copy">
          <div className="pd-kicker">
            <span>HACKSPAIN 2026</span>
            <span>18—20 SEP · MADRID</span>
          </div>
          <p className="pd-eyebrow">DIRECTORIO DE PARTICIPANTES</p>
          <h1>
            CONOCE A LOS <em>BUILDERS</em> DEL FUTURO.
          </h1>
          <p>
            Descubre quién construye en HackSpain, qué sabe hacer y qué quiere
            poner en marcha durante el hackathon.
          </p>
          <a className="pd-primary" href="#participantes">
            Ver participantes <span>↓</span>
          </a>
          <div className="pd-metrics">
            <div>
              <strong>{participants.length}</strong>
              <span>perfiles publicados</span>
            </div>
            <div>
              <strong>48H</strong>
              <span>construyendo</span>
            </div>
            <div>
              <strong>250</strong>
              <span>hackers</span>
            </div>
          </div>
        </div>

        {featured ? (
          <button
            aria-label={`Abrir ficha destacada de ${featured.displayName}`}
            className="pd-featured"
            onClick={() => openParticipant(featured)}
            type="button"
          >
            <div className="pd-rarity">FICHA DESTACADA · #01</div>
            <div className="pd-stripes" />
            <div className="pd-featured-portrait">
              <ParticipantPortrait
                initials={initialsFor(featured.displayName)}
                name={featured.displayName}
                photoUrl={featured.photoUrl}
              />
            </div>
            <div className="pd-featured-score">
              <strong>{featured.cardScore ?? DEFAULT_CARD_SCORE}</strong>
              <span>BUILD</span>
            </div>
            <div className="pd-featured-copy">
              <p>
                {featured.role} · {featured.city}
              </p>
              <h2>{featured.displayName}</h2>
              <div className="pd-tags light">
                {featured.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
            <footer>
              <span>PARTICIPANTE</span>
              <strong>VER FICHA</strong>
            </footer>
          </button>
        ) : (
          <div className="pd-featured pd-placeholder">
            <div className="pd-rarity">DIRECTORIO · HS26</div>
            <div className="pd-stripes" />
            <div className="pd-featured-portrait">
              <span>?</span>
            </div>
            <div className="pd-featured-copy">
              <p>HACKSPAIN 2026</p>
              <h2>PRIMERA FICHA</h2>
            </div>
            <footer>
              <span>LISTA PARA DATOS</span>
            </footer>
          </div>
        )}
      </section>

      <section aria-label="Información del directorio" className="pd-ticker">
        <span>PERFILES VERIFICADOS</span>
        <b>✦</b>
        <span>SKILLS REALES</span>
        <b>✦</b>
        <span>48 HORAS CONSTRUYENDO</span>
        <b>✦</b>
        <span>HACKSPAIN · MADRID 26</span>
      </section>

      <section className="pd-roster" id="participantes">
        <div className="pd-section-heading">
          <div>
            <p className="pd-eyebrow">LA COMUNIDAD</p>
            <h2>PARTICIPANTES</h2>
            <p>
              Perfiles publicados con el consentimiento de cada participante.
            </p>
          </div>
          <span>HS26 · DIRECTORIO</span>
        </div>
        <div className="pd-filters">
          <label>
            <span>Buscar</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, skill, ciudad o rol…"
              value={query}
            />
          </label>
          <div>
            <strong>{filteredParticipants.length}</strong>
            <span>fichas</span>
          </div>
        </div>
        <div className="pd-cards">
          {filteredParticipants.map((participant, index) => (
            <ParticipantCard
              color={CARD_COLORS[index % CARD_COLORS.length] ?? "teal"}
              key={participant.id}
              onOpen={openParticipant}
              participant={participant}
            />
          ))}
        </div>
        {filteredParticipants.length === 0 && (
          <div className="pd-empty">
            <strong>No aparece ese perfil.</strong>
            <span>Prueba con otro nombre, rol o skill.</span>
            <button onClick={() => setQuery("")} type="button">
              Ver todos
            </button>
          </div>
        )}
      </section>

      {selected && (
        <div className="pd-modal-backdrop">
          <section
            aria-labelledby="participant-title"
            aria-modal="true"
            className="pd-modal"
            role="dialog"
          >
            <button
              aria-label="Cerrar"
              className="pd-close"
              onClick={closeParticipant}
              type="button"
            >
              ×
            </button>
            <div className="pd-profile-hero">
              <div className="pd-profile-score">
                <strong>{selected.cardScore ?? DEFAULT_CARD_SCORE}</strong>
                <span>BUILD</span>
              </div>
              <div className="pd-profile-avatar">
                <ParticipantPortrait
                  initials={initialsFor(selected.displayName)}
                  name={selected.displayName}
                  photoUrl={selected.photoUrl}
                />
              </div>
              <div>
                <p>
                  {selected.role} · {selected.city}
                </p>
                <h2 id="participant-title">{selected.displayName}</h2>
                <span>{selected.skills.join(" · ")}</span>
              </div>
            </div>
            <div className="pd-modal-body">
              {selected.lore && (
                <div className="pd-lore">
                  <span>LORE DE JUGADOR</span>
                  <p>“{selected.lore}”</p>
                </div>
              )}
              {selected.bio && <p className="pd-bio">{selected.bio}</p>}
              <div className="pd-tags dark">
                {selected.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
