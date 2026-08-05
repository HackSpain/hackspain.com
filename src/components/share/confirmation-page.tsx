import { useRef, useState } from "react";
import { hsButtonClass } from "../ui/button-styles";
import LanyardBadge from "./lanyard-badge";
import { ShareBackdrop } from "./share-backdrop";
import { useDeviceTilt } from "./use-device-tilt";
import { useDroppedPhoto } from "./use-dropped-photo";

const WHITESPACE_RE = /\s+/;
const SHARE_TEXT = "Voy a HackSpain 2026. Nos vemos en Madrid.";
const COPIED_RESET_MS = 2000;

function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(WHITESPACE_RE).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

interface Props {
  fullName: string;
  githubHandle: string | null;
  /** Public page the share buttons point at. */
  shareUrl: string;
  whatsappUrl: string | null;
}

export function ConfirmationPage({
  fullName,
  githubHandle,
  shareUrl,
  whatsappUrl,
}: Props) {
  const { tilt, needsPermission, requestAccess } = useDeviceTilt();
  const { photo, isDragging, onDragOver, onDragLeave, onDrop, onFileChange } =
    useDroppedPhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const wind = useRef(0);
  const [copied, setCopied] = useState(false);

  const { firstName, lastName } = splitName(fullName);

  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(shareUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      setCopied(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop target, not a control — the photo is optional decoration and everything else on the page is reachable without it.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: same drop target.
    <div
      className="relative h-dvh w-full overflow-hidden bg-hs-paper"
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="absolute inset-0 z-0">
        <ShareBackdrop wind={wind} />
      </div>

      <input
        accept="image/*"
        className="sr-only"
        data-testid="photo-file-input"
        onChange={onFileChange}
        ref={fileInput}
        type="file"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="pointer-events-auto mx-auto max-w-3xl select-none text-center">
          <h1 className="font-bungee text-[clamp(1.6rem,5.5vw,3rem)] text-hs-ink leading-none">
            Plaza confirmada
          </h1>
          <p className="mx-auto mt-3 max-w-md font-sans text-hs-brown text-sm sm:text-base">
            {firstName
              ? `${firstName}, tu acreditación ya es tuya.`
              : "Tu acreditación ya es tuya."}{" "}
            Arrástrala y lánzala. Nos vemos el 18 de septiembre en Madrid.
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
        <LanyardBadge
          content={{ droppedPhoto: photo, firstName, githubHandle, lastName }}
          onPhotoClick={() => fileInput.current?.click()}
          tilt={tilt}
          wind={wind}
        />
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-30 border-[6px] border-hs-ink border-dashed bg-hs-gold/10" />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-6 sm:pb-10">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3 border-[3px] border-hs-ink bg-hs-cream/95 p-4 shadow-[6px_6px_0_0_var(--color-hs-ink)]">
          <span className="font-bungee text-hs-ink text-xs uppercase tracking-wide">
            Cuéntalo
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              className={hsButtonClass("gold", "md", "flex-1 text-center")}
              href={linkedinHref}
              rel="noopener"
              target="_blank"
            >
              LinkedIn
            </a>
            <a
              className={hsButtonClass("gold", "md", "flex-1 text-center")}
              href={xHref}
              rel="noopener"
              target="_blank"
            >
              Twitter
            </a>
            <button
              className={hsButtonClass("teal", "md", "flex-1")}
              onClick={handleCopy}
              type="button"
            >
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
          </div>

          {whatsappUrl && (
            <a
              className={hsButtonClass("gold", "md", "w-full text-center")}
              href={whatsappUrl}
              rel="noopener"
              target="_blank"
            >
              Entrar al grupo de WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
