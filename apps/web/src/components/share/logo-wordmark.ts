import logoSvgRaw from "../../assets/logo.svg?raw";

const LOGO_DIMENSION_VIEWBOX_RE =
  /width="250"\s*height="250"\s*viewBox="0 0 250 250"/;
const LOGO_WORDMARK_VIEW =
  'width="250" height="80" viewBox="0 82 250 80" preserveAspectRatio="xMidYMid meet"';

/** Width-to-height ratio of the cropped wordmark. */
export const LOGO_WORDMARK_ASPECT = 80 / 250;

/**
 * The logo cropped down to its wordmark, inline so it needs no network request.
 * Shared by the badge canvas in the browser and the social image on the server.
 */
export function logoWordmarkDataUri(): string {
  const svg = logoSvgRaw.replace(LOGO_DIMENSION_VIEWBOX_RE, LOGO_WORDMARK_VIEW);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
