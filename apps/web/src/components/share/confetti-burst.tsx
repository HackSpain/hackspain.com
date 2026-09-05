import { useEffect, useRef } from "react";
import { HS_PALETTE } from "../theme/palette";

/**
 * The brand's paper, minus its two background tones: a flake in those would be
 * invisible against the plain it falls onto.
 */
const FLAKE_COLORS = [
  HS_PALETTE.gold,
  HS_PALETTE.orange,
  HS_PALETTE.red,
  HS_PALETTE.teal,
  HS_PALETTE.navy,
  HS_PALETTE.slate,
];

/** One cannon in each bottom corner, both angled in across the badge. */
const FLAKES_PER_CANNON = 55;
/**
 * Speeds and sizes are shares of the screen's short side rather than pixels, so
 * a phone gets the same throw across the same proportion of the view instead of
 * a shower of dust in one corner.
 */
const LAUNCH_SPEED = 1.15;
const LAUNCH_SPEED_SPREAD = 0.55;
const GRAVITY = 1.9;
const AIR_DRAG = 1.1;
const FLAKE_WIDTH = 0.013;
/** Radians per second, either way round, so the flakes tumble rather than fall flat. */
const SPIN = 9;
const MIN_LIFE = 2.4;
const LIFE_SPREAD = 1.2;
/** The tail of a flake's life, spent fading, so none of them blink out. */
const FADE_SECONDS = 0.8;
/** Launch angles off the horizontal — never sideways, never straight up. */
const MIN_ANGLE = 38 * (Math.PI / 180);
const MAX_ANGLE = 78 * (Math.PI / 180);
/** A tab handed back from the background gives one huge delta; cap it. */
const MAX_FRAME_DELTA = 1 / 30;

interface Flake {
  angle: number;
  color: string;
  height: number;
  life: number;
  spin: number;
  vx: number;
  vy: number;
  width: number;
  x: number;
  y: number;
}

/** `direction` is 1 for the left cannon and -1 for the right one. */
function createFlake(
  direction: number,
  width: number,
  height: number,
  base: number
): Flake {
  const angle = MIN_ANGLE + Math.random() * (MAX_ANGLE - MIN_ANGLE);
  const speed = base * (LAUNCH_SPEED + Math.random() * LAUNCH_SPEED_SPREAD);
  const flakeWidth = base * FLAKE_WIDTH;

  return {
    angle: Math.random() * Math.PI,
    color: FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)],
    // Squarer or longer at random, so they do not read as one repeated shape.
    height: flakeWidth * (0.5 + Math.random()),
    life: MIN_LIFE + Math.random() * LIFE_SPREAD,
    spin: (Math.random() - 0.5) * SPIN,
    vx: Math.cos(angle) * speed * direction,
    vy: -Math.sin(angle) * speed,
    width: flakeWidth,
    x: direction === 1 ? 0 : width,
    y: height,
  };
}

/**
 * Two cannons of brand-coloured paper, fired once when the page arrives. It runs
 * on its own canvas over the scene and stops for good once the last flake is off
 * the bottom, so nothing is left animating behind the badge.
 */
export function ConfettiBurst() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const ctx = element.getContext("2d");
    if (!ctx) {
      return;
    }

    // Sized once: the burst is over in a few seconds, and a window resized
    // mid-flight is not worth carrying the listener for.
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = element.clientWidth;
    const height = element.clientHeight;
    element.width = width * ratio;
    element.height = height * ratio;
    ctx.scale(ratio, ratio);

    const base = Math.min(width, height);
    const flakes = [1, -1].flatMap((direction) =>
      Array.from({ length: FLAKES_PER_CANNON }, () =>
        createFlake(direction, width, height, base)
      )
    );

    let last = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_FRAME_DELTA);
      last = now;
      ctx.clearRect(0, 0, width, height);

      let anyLeft = false;
      for (const flake of flakes) {
        if (flake.life <= 0) {
          continue;
        }

        flake.life -= delta;
        flake.vy += base * GRAVITY * delta;
        // Only the sideways throw is bled off; gravity owns the vertical.
        flake.vx -= flake.vx * AIR_DRAG * delta;
        flake.x += flake.vx * delta;
        flake.y += flake.vy * delta;
        flake.angle += flake.spin * delta;

        if (flake.y - flake.height > height) {
          flake.life = 0;
          continue;
        }

        anyLeft = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, flake.life / FADE_SECONDS));
        ctx.translate(flake.x, flake.y);
        ctx.rotate(flake.angle);
        ctx.fillStyle = flake.color;
        ctx.fillRect(
          -flake.width / 2,
          -flake.height / 2,
          flake.width,
          flake.height
        );
        ctx.restore();
      }

      if (!anyLeft) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    // No `aria-hidden`: a canvas counts as focusable, and hiding one of those
    // from assistive tech is worse than leaving this empty and unlabelled.
    <canvas
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      ref={canvas}
    />
  );
}
