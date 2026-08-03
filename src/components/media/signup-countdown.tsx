import { useEffect, useState } from "react";
import { SIGNUP_DEADLINE_MS } from "../../data/signup-deadline";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

interface Remaining {
  days: number;
  expired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingAt(now: number): Remaining {
  const delta = SIGNUP_DEADLINE_MS - now;
  if (delta <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(delta / DAY_MS),
    hours: Math.floor((delta % DAY_MS) / HOUR_MS),
    minutes: Math.floor((delta % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((delta % MINUTE_MS) / SECOND_MS),
    expired: false,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function plural(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

function ariaLabelFor(r: Remaining) {
  const parts = [
    plural(r.days, "día", "días"),
    plural(r.hours, "hora", "horas"),
    plural(r.minutes, "minuto", "minutos"),
  ];
  return `Quedan ${parts.join(", ")} para que cierre la inscripción`;
}

/**
 * Font sizing basis: the desktop mosaic sizes against its cell `@container`,
 * the compact layout against the viewport (matching the rest of each layout).
 */
const SIZES = {
  mosaic: {
    digit: "text-[clamp(0.9rem,min(9cqw,15cqh),2.1rem)]",
    unit: "text-[clamp(0.45rem,2.6cqw,0.7rem)]",
    gap: "gap-x-2 gap-y-1",
  },
  /** Mosaic cells that already hold a headline and a CTA — the home hero card. */
  mosaicSm: {
    digit: "text-[clamp(0.7rem,min(5cqw,7cqh),1.2rem)]",
    unit: "text-[clamp(0.4rem,2cqw,0.6rem)]",
    gap: "gap-x-1.5 gap-y-0.5",
  },
  compact: {
    digit: "text-[clamp(1.3rem,6.5vw,2.6rem)]",
    unit: "text-[clamp(0.55rem,2.4vw,0.8rem)]",
    gap: "gap-x-3 gap-y-1",
  },
  /** Compact cards that already hold a headline and a CTA — the home hero card. */
  compactSm: {
    digit: "text-[clamp(0.85rem,4.2vw,1.5rem)]",
    unit: "text-[clamp(0.5rem,2vw,0.7rem)]",
    gap: "gap-x-2 gap-y-0.5",
  },
} as const;

interface Props {
  className?: string;
  /** Heading beside/above the digits — hidden with them once the deadline passes. */
  label?: string;
  labelClassName?: string;
  /**
   * "stack" gives each unit its own column under a heading; "inline" keeps the
   * whole thing on one line (`06d 13h 17m 26s`) for cells with a single line to
   * spare.
   */
  layout?: "stack" | "inline";
  /** Layout the countdown is rendered in — drives font sizing only. */
  variant?: keyof typeof SIZES;
}

/**
 * Time left until the signup deadline, re-evaluated every second. Shared by the
 * countdown and by the signup CTAs, which close once `expired` flips.
 */
export function useSignupCountdown(): Remaining {
  const [remaining, setRemaining] = useState(() => remainingAt(Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(remainingAt(Date.now()));
    tick();
    const id = setInterval(tick, SECOND_MS);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

/**
 * Ticking countdown to the signup deadline. Renders nothing once the deadline
 * has passed, so a stale page never shows a row of zeros.
 *
 * Colours are inherited: digits use the parent's text colour, unit labels a
 * dimmed version of it.
 */
export function SignupCountdown({
  className,
  label,
  labelClassName,
  layout = "stack",
  variant = "mosaic",
}: Props) {
  const remaining = useSignupCountdown();

  if (remaining.expired) {
    return null;
  }

  const size = SIZES[variant];
  const units: { key: string; value: number; label: string }[] = [
    { key: "d", value: remaining.days, label: "Días" },
    { key: "h", value: remaining.hours, label: "Horas" },
    { key: "m", value: remaining.minutes, label: "Min" },
    { key: "s", value: remaining.seconds, label: "Seg" },
  ];

  if (layout === "inline") {
    return (
      <div
        aria-label={ariaLabelFor(remaining)}
        className={[
          "flex flex-wrap items-baseline justify-center",
          size.gap,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        role="timer"
      >
        {label ? <span className={labelClassName}>{label}</span> : null}
        {units.map((unit) => (
          <span
            className={`font-bungee tabular-nums leading-none ${size.digit}`}
            key={unit.key}
            suppressHydrationWarning
          >
            {pad(unit.value)}
            <span className={`opacity-55 ${size.unit}`}>{unit.key}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={["flex flex-col items-center gap-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? <p className={labelClassName}>{label}</p> : null}
      <div
        aria-label={ariaLabelFor(remaining)}
        className={`flex flex-wrap items-start justify-center ${size.gap}`}
        role="timer"
      >
        {units.map((unit) => (
          <div
            className="flex min-w-[2.2em] flex-col items-center leading-none"
            key={unit.key}
          >
            <span
              className={`font-bungee tabular-nums ${size.digit}`}
              suppressHydrationWarning
            >
              {pad(unit.value)}
            </span>
            <span
              className={`mt-1 font-black font-sans uppercase tracking-widest opacity-55 ${size.unit}`}
            >
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
