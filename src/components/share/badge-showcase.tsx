import { useRef } from "react";
import { splitBadgeName } from "../../lib/badge-name";
import { hsButtonClass } from "../ui/button-styles";
import LanyardBadge from "./lanyard-badge";
import { ShareBackdrop } from "./share-backdrop";
import { useDeviceTilt } from "./use-device-tilt";
import { useImageFromSrc } from "./use-image-from-src";

interface Props {
  fullName: string;
  githubHandle: string | null;
  /** The photo they put on their badge, when they chose one over their avatar. */
  photoDataUri: string | null;
}

/**
 * Someone else's badge, opened from a shared link. It stays playable, because
 * throwing the card around is the whole appeal, but it offers nothing to edit
 * and nothing to share: the only way on from here is into the event itself.
 */
export function BadgeShowcase({ fullName, githubHandle, photoDataUri }: Props) {
  const { tilt, needsPermission, requestAccess } = useDeviceTilt();
  const wind = useRef(0);
  const { firstName, lastName } = splitBadgeName(fullName);
  // Takes the same slot a dropped photo would, which already wins over the
  // avatar, so the card here matches the one in the link preview.
  const photo = useImageFromSrc(photoDataUri);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-hs-paper">
      <div className="absolute inset-0 z-0">
        <ShareBackdrop wind={wind} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="pointer-events-auto mx-auto max-w-3xl select-none text-center">
          <h1 className="font-bungee text-[clamp(1.6rem,5.5vw,3rem)] text-hs-ink leading-none">
            {firstName} va a HackSpain 2026
          </h1>
          <p className="mx-auto mt-3 max-w-md font-sans text-hs-brown text-sm sm:text-base">
            Su acreditación ya está impresa. Arrástrala y lánzala. Del 18 al 20
            de septiembre en Madrid.
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
          tilt={tilt}
          wind={wind}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-6 sm:pb-10">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-3 border-[3px] border-hs-ink bg-hs-cream/95 p-4 text-center shadow-[6px_6px_0_0_var(--color-hs-ink)]">
          <span className="font-sans text-hs-brown text-sm">
            48 horas construyendo en la UPM, con 250 hackers más.
          </span>
          <a className={hsButtonClass("gold", "md", "w-full")} href="/">
            Descubre HackSpain
          </a>
        </div>
      </div>
    </div>
  );
}
