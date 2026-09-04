import { useEffect, useState } from "react";

const TARGET = 250;
const DURATION_MS = 1600;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

interface Props {
  ariaLabel: string;
  className?: string;
}

export function ParticipantsCountUp({ className = "", ariaLabel }: Props) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setValue(TARGET);
      return;
    }

    let startTime: number | undefined;
    let frame = 0;

    const step = (now: number) => {
      if (startTime === undefined) {
        startTime = now;
      }
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / DURATION_MS);
      setValue(Math.round(TARGET * easeOutCubic(p)));
      if (p < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span
      aria-label={ariaLabel}
      className={`tabular-nums ${className}`.trim()}
      role="img"
    >
      {value}
    </span>
  );
}
