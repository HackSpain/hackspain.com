import { type RefObject, useEffect, useRef } from "react";
import { InlineSvg } from "../media/inline-svg";
import { horseSvg, quixoteSvg, sunSvg } from "../theme/assets";
import { Windmill } from "./windmill";

/** Degrees per second with the air still, and the most the badge can add. */
const CALM_SAIL_SPEED = 14;
const GUST_SAIL_SPEED = 150;
const MAX_FRAME_DELTA = 1 / 30;
const FULL_TURN = 360;

/**
 * Portrait keeps the horizon high so the plain is not swallowed by the control
 * panel; landscape drops it so the ground stays a base rather than half the
 * view. Everything standing on the plain shares the matching offset.
 */
const HORIZON_TOP = "top-[54%] sm:top-[66%]";
const ON_HORIZON = "bottom-[46%] sm:bottom-[34%]";

interface Props {
  /** 0 = still air, 1 = the badge is being thrown about. */
  wind: RefObject<number>;
}

/**
 * The plain of La Mancha at the hour of the wind. The point is that one thing
 * moves everything: the same gust that swings the badge turns the sails, so the
 * scene reads as a place the badge hangs in rather than decoration behind it.
 */
export function ShareBackdrop({ wind }: Props) {
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scene.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let angle = 0;
    let last = performance.now();
    let frame = 0;

    const turn = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_FRAME_DELTA);
      last = now;
      const gust = Math.max(0, Math.min(1, wind.current));
      angle =
        (angle + (CALM_SAIL_SPEED + gust * GUST_SAIL_SPEED) * delta) %
        FULL_TURN;
      element.style.setProperty("--hs-sail-angle", `${angle}deg`);
      frame = requestAnimationFrame(turn);
    };

    frame = requestAnimationFrame(turn);
    return () => cancelAnimationFrame(frame);
  }, [wind]);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      ref={scene}
    >
      <div className="hs-grain absolute inset-0" />

      <InlineSvg
        className="absolute top-[22%] left-[7%] w-[10vmin] opacity-30"
        decorative
        svg={sunSvg}
      />

      {/* The plain: horizon rule, then dry ground below it. */}
      <div
        className={`absolute inset-x-0 bottom-0 border-hs-ink border-t-[3px] bg-hs-sand ${HORIZON_TOP}`}
      >
        <div className="hs-plain-furrows absolute inset-0" />
      </div>

      {/* Distant mills, shrinking and fading toward the vanishing point. */}
      <Windmill className={`left-[4%] h-[11vmin] opacity-40 ${ON_HORIZON}`} />
      <Windmill className={`left-[19%] h-[8vmin] opacity-30 ${ON_HORIZON}`} />
      <Windmill className={`left-[31%] h-[9vmin] opacity-35 ${ON_HORIZON}`} />

      {/* Two riders crossing the plain, small enough to be a reward for looking. */}
      <div
        className={`absolute left-[45%] flex h-[4vmin] items-end gap-[0.4vmin] opacity-45 [&_span]:h-full [&_svg]:brightness-0 ${ON_HORIZON}`}
      >
        <InlineSvg className="h-full" decorative svg={horseSvg} />
        <InlineSvg className="h-full" decorative svg={quixoteSvg} />
      </div>

      {/* Foreground mill, cropped by the edge so the scene carries on past it. */}
      <Windmill className={`right-[-3rem] h-[34vmin] ${ON_HORIZON}`} />
    </div>
  );
}
