import type { LayoutProfile } from "./artboard";
import { CELLS_COMPACT } from "./cells-compact";

export interface CellDef {
  clip?: string;
  delay: number;
  h: number;
  id: string;
  w: number;
  x: number;
  y: number;
}

/**
 * Desktop content grid — strict horizontal bands, no y-overlap.
 *
 * Bands: 0-180 (top) | 180-400 (hero) | 400-650 | 650-830 (open) | 830-900
 * (footer). The hero band sits one row up from center; the open band at
 * 650-830 is intentionally free for additional content.
 * Each content cell is a clean rectangle aligned to a mosaic tile.
 * Decorative-only tiles (corners, triangles, accents) are drawn by
 * MosaicBackground and intentionally have no entry here.
 *
 * Top, content and open bands share the same symmetric column layout
 * (220 | centered 560 | 220) so each has a clean, neatly centered main cell
 * (`r1c`, `r4c`, `open`).
 */
const CELLS: CellDef[] = [
  // Band 1 (top row) — y 0-180 : 7 cells, narrow centered main cell (r1c)
  // Columns: 0-200 | 200-390 (r1b) | 390-580 | 580-860 (r1c) | 860-1050 |
  // 1050-1240 (r1d) | 1240-1440
  { id: "r1b", x: 200, y: 0, w: 190, h: 180, delay: 0.03 },
  { id: "r1c", x: 580, y: 0, w: 280, h: 180, delay: 0.02 },
  { id: "r1d", x: 1050, y: 0, w: 190, h: 180, delay: 0.04 },

  // Band 2 (hero row) — y 180-400
  { id: "r3a", x: 200, y: 180, w: 280, h: 220, delay: 0.05 },
  { id: "hero", x: 480, y: 180, w: 480, h: 220, delay: 0 },
  { id: "r3b", x: 960, y: 180, w: 260, h: 220, delay: 0.07 },

  // Band 3 (content row) — y 400-650 : symmetric, centered main cell (r4c)
  { id: "r4b", x: 220, y: 400, w: 220, h: 250, delay: 0.06 },
  { id: "r4c", x: 440, y: 400, w: 560, h: 250, delay: 0.04 },
  { id: "r4d", x: 1000, y: 400, w: 220, h: 250, delay: 0.08 },

  // Band 4 (open row) — y 650-830 : 5 equal cells (288 wide), free on the homepage
  { id: "o1", x: 0, y: 650, w: 288, h: 180, delay: 0.03 },
  { id: "o2", x: 288, y: 650, w: 288, h: 180, delay: 0.05 },
  { id: "o3", x: 576, y: 650, w: 288, h: 180, delay: 0.04 },
  { id: "o4", x: 864, y: 650, w: 288, h: 180, delay: 0.06 },
  { id: "o5", x: 1152, y: 650, w: 288, h: 180, delay: 0.07 },

  // Band 5 (footer) — y 830-900
  { id: "r5a", x: 0, y: 830, w: 360, h: 70, delay: 0.03 },
  { id: "r5b", x: 360, y: 830, w: 360, h: 70, delay: 0.05 },
  { id: "r5c", x: 720, y: 830, w: 360, h: 70, delay: 0.07 },
  { id: "r5d", x: 1080, y: 830, w: 360, h: 70, delay: 0.09 },
];

export function cellsForProfile(profile: LayoutProfile): CellDef[] {
  if (profile !== "compact") {
    return CELLS;
  }
  return CELLS_COMPACT;
}
