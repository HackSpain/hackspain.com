export interface Artboard {
  h: number;
  w: number;
}

export const ARTBOARD_DESKTOP: Artboard = { w: 1440, h: 900 };

const ARTBOARD_COMPACT: Artboard = { w: 1440, h: 2320 };

export type LayoutProfile = "desktop" | "compact";

export const COMPACT_MEDIA_QUERY = "(max-width: 767px)";

export function artboardFor(profile: LayoutProfile): Artboard {
  return profile === "compact" ? ARTBOARD_COMPACT : ARTBOARD_DESKTOP;
}
