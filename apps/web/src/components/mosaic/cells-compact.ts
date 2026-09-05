import type { CellDef } from "./cells";

/**
 * Compact (portrait) layout — artboard 1440 x 2320.
 *
 * hero | b1 | ornament (5 decorative cells) | b2 | foot
 */
export const CELLS_COMPACT: CellDef[] = [
  { id: "hero", x: 0, y: 0, w: 1440, h: 580, delay: 0 },
  { id: "b1", x: 0, y: 580, w: 1440, h: 640, delay: 0.05 },
  // Ornament strip — 5 equal cells, purely decorative
  { id: "orn1", x: 0, y: 1220, w: 288, h: 200, delay: 0.03 },
  { id: "orn2", x: 288, y: 1220, w: 288, h: 200, delay: 0.04 },
  { id: "orn3", x: 576, y: 1220, w: 288, h: 200, delay: 0.05 },
  { id: "orn4", x: 864, y: 1220, w: 288, h: 200, delay: 0.06 },
  { id: "orn5", x: 1152, y: 1220, w: 288, h: 200, delay: 0.07 },
  { id: "b2", x: 0, y: 1420, w: 1440, h: 660, delay: 0.1 },
  { id: "foot", x: 0, y: 2080, w: 1440, h: 240, delay: 0.15 },
];
