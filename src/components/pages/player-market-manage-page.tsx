"use client";

import { type FormEvent, useMemo, useState } from "react";
import type {
  PlayerMarketPrivateOffer,
  PlayerMarketPrivateProfile,
} from "../../lib/player-market-service";

interface PlayerMarketManagePageProps {
  initialOffers: PlayerMarketPrivateOffer[];
  initialProfile: PlayerMarketPrivateProfile | null;
}

const sponsorshipOptions = [
  { id: "equipped", label: "Equipado por" },
  { id: "built_with", label: "Construido con" },
  { id: "team_sponsor", label: "Team sponsor" },
] as const;

const sponsorshipNames = new Map(
  sponsorshipOptions.map((option) => [option.id, option.label])
);

const statusNames = {
  accepted: "Aceptada",
  expired: "Caducada",
  negotiating: "Negociando",
  rejected: "Rechazada",
  sent: "Nueva",
} as const;

function getProfileNotice(
  publish: boolean,
  status: PlayerMarketPrivateProfile["status"]
) {
  if (publish) {
    return "Ficha publicada. Ya puede recibir ofertas.";
  }
  if (status === "hidden") {
    return "Ficha guardada y oculta.";
  }
  return "Borrador guardado.";
}

function getDecisionNotice(action: "accept" | "negotiate" | "reject") {
  if (action === "accept") {
    return "Fichaje aceptado. Ya aparece en Fichajes live.";
  }
  if (action === "reject") {
    return "Oferta rechazada.";
  }
  return "Has propuesto cambios a la marca.";
}

function getProfileStatusName(status: PlayerMarketPrivateProfile["status"]) {
  if (status === "published") {
    return "PUBLICADA";
  }
  if (status === "hidden") {
    return "OCULTA";
  }
  return "BORRADOR";
}

export function PlayerMarketManagePage({
  initialOffers,
  initialProfile,
}: PlayerMarketManagePageProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [offers, setOffers] = useState(initialOffers);
  const [notice, setNotice] = useState("");
  const [accessSent, setAccessSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [negotiationNotes, setNegotiationNotes] = useState<
    Record<string, string>
  >({});

  const profileLink = useMemo(
    () => (profile ? `/player-market?view=startup&player=${profile.slug}` : ""),
    [profile]
  );

  const submitAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/player-market/access/request", {
        body: JSON.stringify({
          audience: "player",
          email: form.get("email"),
          returnTo: "/player-market/manage",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { debugUrl?: string };
      if (!response.ok) {
        setNotice("Revisa el email e inténtalo de nuevo.");
      } else if (result.debugUrl) {
        window.location.assign(result.debugUrl);
      } else {
        setAccessSent(true);
      }
    } catch {
      setNotice("No se pudo solicitar el acceso. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveProfile = async (form: HTMLFormElement, publish: boolean) => {
    if (!profile) {
      return;
    }
    setSubmitting(true);
    const data = new FormData(form);
    const skills = String(data.get("skills") ?? "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    const sponsorshipTypes = data.getAll("sponsorshipTypes").map(String);
    try {
      const response = await fetch("/api/player-market/profile", {
        body: JSON.stringify({
          bio: data.get("bio"),
          city: data.get("city"),
          displayName: data.get("displayName"),
          isAvailable: data.get("isAvailable") === "on",
          lore: data.get("lore"),
          publish,
          role: data.get("role"),
          skills,
          sponsorshipTypes,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as {
        profile?: PlayerMarketPrivateProfile;
      };
      if (response.ok && result.profile) {
        setProfile(result.profile);
        setNotice(getProfileNotice(publish, result.profile.status));
      } else {
        setNotice("Revisa los campos obligatorios antes de guardar.");
      }
    } catch {
      setNotice("No se pudo guardar la ficha. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const decideOffer = async (
    offerId: string,
    action: "accept" | "negotiate" | "reject"
  ) => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/player-market/offers/${encodeURIComponent(offerId)}/decision`,
        {
          body: JSON.stringify({
            action,
            note:
              action === "negotiate" ? negotiationNotes[offerId] : undefined,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      const result = (await response.json()) as {
        offer?: { id: string; status: PlayerMarketPrivateOffer["status"] };
      };
      if (response.ok && result.offer) {
        const updatedOffer = result.offer;
        setOffers((current) =>
          current.map((offer) =>
            offer.id === updatedOffer.id
              ? { ...offer, status: updatedOffer.status }
              : offer
          )
        );
        setNotice(getDecisionNotice(action));
      } else {
        setNotice("No se pudo actualizar la oferta.");
      }
    } catch {
      setNotice("No se pudo actualizar la oferta.");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/player-market/logout", { method: "POST" });
    window.location.assign("/player-market?view=builder");
  };

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(
      new URL(profileLink, window.location.origin).toString()
    );
    setNotice("Enlace público copiado.");
  };

  if (!profile) {
    return (
      <main className="site-shell manage-shell">
        <header className="topbar">
          <a className="wordmark" href="/player-market?view=builder">
            <img alt="" height="46" src="/hs-icon.png" width="46" />
            <span>
              <strong>PLAYER</strong> MARKET
            </span>
          </a>
        </header>
        <section className="manage-access">
          <div className="manage-card">
            {accessSent ? (
              <div className="success-view">
                <div className="success-mark">✉</div>
                <p className="eyebrow">ENLACE ENVIADO</p>
                <h1>REVISA TU CORREO.</h1>
                <p>
                  Si tu plaza está confirmada, recibirás un enlace privado de un
                  solo uso.
                </p>
              </div>
            ) : (
              <form className="offer-form" onSubmit={submitAccess}>
                <p className="eyebrow">VESTUARIO PRIVADO</p>
                <h1>ENTRA EN TU FICHA.</h1>
                <p>
                  Usa el mismo email con el que confirmaste tu plaza. No
                  necesitas contraseña.
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
            {notice && (
              <p className="manage-notice" role="status">
                {notice}
              </p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="site-shell manage-shell">
      <header className="topbar">
        <a className="wordmark" href="/player-market?view=builder">
          <img alt="" height="46" src="/hs-icon.png" width="46" />
          <span>
            <strong>PLAYER</strong> MARKET
          </span>
        </a>
        <div className="header-actions">
          {profile.status === "published" && (
            <button
              className="share-button"
              onClick={copyProfileLink}
              type="button"
            >
              ↗ Compartir ficha
            </button>
          )}
          <button className="secondary-cta" onClick={logout} type="button">
            Salir
          </button>
        </div>
      </header>

      <section className="manage-hero">
        <div>
          <p className="eyebrow">TU VESTUARIO · ACCESO PRIVADO</p>
          <h1>
            EDITA TU FICHA.
            <br />
            <em>TÚ DECIDES.</em>
          </h1>
          <p>
            Revisa qué se muestra, elige qué patrocinios te representan y
            responde cada oferta.
          </p>
        </div>
        <div className="manage-status">
          <span>ESTADO DE LA FICHA</span>
          <strong>{getProfileStatusName(profile.status)}</strong>
          <small>
            {profile.status === "published"
              ? "Visible en el escaparate"
              : "Solo tú puedes verla"}
          </small>
        </div>
      </section>

      {notice && (
        <div className="manage-notice sticky-notice" role="status">
          {notice}
        </div>
      )}

      <section className="manage-grid">
        <form
          className="manage-card profile-editor"
          onSubmit={async (event) => {
            event.preventDefault();
            await saveProfile(event.currentTarget, true);
          }}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">DATOS PÚBLICOS</p>
              <h2>TU FICHA</h2>
            </div>
          </div>
          <label>
            <span>Nombre visible</span>
            <input
              defaultValue={profile.displayName}
              maxLength={80}
              minLength={2}
              name="displayName"
              required
            />
          </label>
          <div className="form-row">
            <label>
              <span>Rol</span>
              <input
                defaultValue={profile.role}
                maxLength={80}
                minLength={2}
                name="role"
                placeholder="AI Engineer"
                required
              />
            </label>
            <label>
              <span>Ciudad</span>
              <input
                defaultValue={profile.city}
                maxLength={80}
                minLength={2}
                name="city"
                required
              />
            </label>
          </div>
          <label>
            <span>Skills, separadas por comas</span>
            <input
              defaultValue={profile.skills.join(", ")}
              name="skills"
              placeholder="LLM, Python, Agents"
              required
            />
          </label>
          <label>
            <span>Bio</span>
            <textarea
              defaultValue={profile.bio}
              maxLength={360}
              name="bio"
              rows={3}
            />
          </label>
          <label>
            <span>Lore de jugador</span>
            <textarea
              defaultValue={profile.lore}
              maxLength={260}
              minLength={10}
              name="lore"
              required
              rows={3}
            />
          </label>

          <fieldset className="choice-fieldset">
            <legend>Qué tipos de patrocinio aceptarías</legend>
            <div className="manage-checks">
              {sponsorshipOptions.map((option) => (
                <label className="check-line" key={option.id}>
                  <input
                    defaultChecked={profile.sponsorshipTypes.includes(
                      option.id
                    )}
                    name="sponsorshipTypes"
                    type="checkbox"
                    value={option.id}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="check-line">
            <input
              defaultChecked={profile.isAvailable}
              name="isAvailable"
              type="checkbox"
            />
            <span>Quiero recibir nuevas ofertas.</span>
          </label>
          <div className="manage-actions">
            <button className="primary-cta" disabled={submitting} type="submit">
              {submitting ? "Guardando…" : "Guardar y publicar"}
              <span>→</span>
            </button>
            <button
              className="secondary-cta"
              disabled={submitting}
              onClick={async (event) => {
                const form = event.currentTarget.form;
                if (form) {
                  await saveProfile(form, false);
                }
              }}
              type="button"
            >
              Guardar sin publicar
            </button>
          </div>
          <small className="form-note">
            Al publicar confirmas que HackSpain puede mostrar estos datos en
            Player Market. Puedes ocultar la ficha cuando quieras.
          </small>
        </form>

        <section className="manage-card offers-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BANDEJA DE FICHAJES</p>
              <h2>OFERTAS</h2>
              <p>
                Cada oferta detalla el tipo de patrocinio, qué recibes y qué te
                piden.
              </p>
            </div>
            <span className="demo-label">{offers.length} TOTAL</span>
          </div>
          {offers.length === 0 ? (
            <div className="empty-state">
              <strong>Aún no hay ofertas.</strong>
              <span>Cuando llegue una, aparecerá aquí completa.</span>
            </div>
          ) : (
            <div className="manage-offers">
              {offers.map((offer) => {
                const canDecide =
                  offer.status === "sent" || offer.status === "negotiating";
                return (
                  <article className="manage-offer" key={offer.id}>
                    <div className="offer-heading">
                      <div>
                        <span>
                          {sponsorshipNames.get(
                            offer.sponsorshipType as (typeof sponsorshipOptions)[number]["id"]
                          ) ?? "Patrocinio"}
                        </span>
                        <h3>{offer.companyName}</h3>
                      </div>
                      <strong>{statusNames[offer.status]}</strong>
                    </div>
                    <div className="contract-amount">
                      <span>QUÉ RECIBES</span>
                      <strong>{offer.rewardSummary}</strong>
                    </div>
                    <div className="contract-terms">
                      <span>QUÉ TE PIDEN</span>
                      <div>
                        <b>✓</b>
                        {offer.deliverables}
                      </div>
                    </div>
                    {offer.message && <p>{offer.message}</p>}
                    {canDecide && (
                      <>
                        <label>
                          <span>
                            Si quieres negociar, explica qué cambiarías
                          </span>
                          <textarea
                            maxLength={700}
                            onChange={(event) =>
                              setNegotiationNotes((current) => ({
                                ...current,
                                [offer.id]: event.target.value,
                              }))
                            }
                            rows={2}
                            value={negotiationNotes[offer.id] ?? ""}
                          />
                        </label>
                        <div className="contract-actions">
                          <button
                            className="primary-cta full"
                            disabled={submitting}
                            onClick={() => decideOffer(offer.id, "accept")}
                            type="button"
                          >
                            Me representa. Aceptar <span>✓</span>
                          </button>
                          <button
                            className="secondary-cta full negotiate"
                            disabled={
                              submitting || !negotiationNotes[offer.id]?.trim()
                            }
                            onClick={() => decideOffer(offer.id, "negotiate")}
                            type="button"
                          >
                            Proponer otro trato
                          </button>
                          <button
                            className="text-reject"
                            disabled={submitting}
                            onClick={() => decideOffer(offer.id, "reject")}
                            type="button"
                          >
                            Rechazar propuesta
                          </button>
                        </div>
                      </>
                    )}
                    {offer.status === "accepted" && (
                      <a
                        className="primary-cta compact"
                        href="/player-market?view=live"
                      >
                        Ver en Fichajes live <span>→</span>
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
