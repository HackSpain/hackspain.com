import { useEffect, useMemo, useRef, useState } from "react";
import { hsButtonClass } from "../ui/button-styles";
import { BADGE_ROLES, type BadgeRoleId, badgeRoleById } from "./badge-roles";
import LanyardBadge from "./lanyard-badge";
import { ShareBackdrop } from "./share-backdrop";
import { useDeviceTilt } from "./use-device-tilt";

const DEFAULT_NAME = "Nombre Apellido";
const NAME_MAX_LENGTH = 40;
const WHITESPACE_RE = /\s+/;

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(WHITESPACE_RE).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Nombre", lastName: "Apellido" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function SharePage() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [roleId, setRoleId] = useState<BadgeRoleId>("hacker");
  const [copied, setCopied] = useState(false);
  const { tilt, needsPermission, requestAccess } = useDeviceTilt();
  const wind = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramName = params.get("name")?.trim();
    const paramRole = params.get("role")?.trim().toLowerCase();
    if (paramName) {
      setName(paramName.slice(0, NAME_MAX_LENGTH));
    }
    if (BADGE_ROLES.some((role) => role.id === paramRole)) {
      setRoleId(paramRole as BadgeRoleId);
    }
  }, []);

  const role = badgeRoleById(roleId);
  const content = useMemo(() => ({ role, ...splitName(name) }), [role, name]);

  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("name", name.trim());
    url.searchParams.set("role", roleId);
    return url.toString();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-hs-paper">
      <div className="absolute inset-0 z-0">
        <ShareBackdrop wind={wind} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="pointer-events-auto mx-auto max-w-3xl select-none text-center">
          <h1 className="font-bungee text-[clamp(1.6rem,5.5vw,3rem)] text-hs-ink leading-none">
            Tu acreditación
          </h1>
          <p className="mx-auto mt-3 max-w-md font-sans text-hs-brown text-sm sm:text-base">
            Arrastra la tarjeta y lánzala. Pon tu nombre, elige tu rol y
            comparte que vas a HackSpain.
          </p>
          <p className="mt-2 hidden font-bungee text-hs-brown text-xs uppercase tracking-wide [@media(pointer:coarse)]:block">
            Inclina el móvil y se balancea sola
          </p>
          {needsPermission && (
            <button
              className={hsButtonClass("teal", "micro", "!py-2 mt-3")}
              onClick={requestAccess}
              type="button"
            >
              Activar movimiento
            </button>
          )}
        </div>
      </div>

      <div className="absolute inset-0 z-10">
        <LanyardBadge content={content} tilt={tilt} wind={wind} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-6 sm:pb-10">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col items-center gap-3 border-[3px] border-hs-ink bg-hs-cream/95 p-4 shadow-[6px_6px_0_0_var(--color-hs-ink)] sm:flex-row sm:gap-4">
          <label className="w-full sm:flex-1" htmlFor="badge-name">
            <span className="mb-1 block font-bungee text-hs-ink text-xs uppercase tracking-wide">
              Nombre
            </span>
            <input
              autoComplete="name"
              className="w-full border-[3px] border-hs-ink bg-hs-paper px-3 py-2 font-bold font-sans text-hs-ink outline-none focus-visible:border-hs-navy"
              id="badge-name"
              maxLength={NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder={DEFAULT_NAME}
              type="text"
              value={name}
            />
          </label>

          <div className="w-full sm:w-auto">
            <span className="mb-1 block font-bungee text-hs-ink text-xs uppercase tracking-wide">
              Rol
            </span>
            <div className="flex gap-2">
              {BADGE_ROLES.map((option) => (
                <button
                  aria-pressed={option.id === roleId}
                  className={hsButtonClass(
                    option.id === roleId ? "gold" : "teal",
                    "micro",
                    "!py-2 flex-1 sm:flex-initial"
                  )}
                  key={option.id}
                  onClick={() => setRoleId(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className={hsButtonClass("gold", "md", "w-full sm:mt-5 sm:w-auto")}
            onClick={handleCopy}
            type="button"
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
      </div>
    </div>
  );
}
