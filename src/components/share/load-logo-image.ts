import logoSvgRaw from "../../assets/logo.svg?raw";

const LOGO_DIMENSION_VIEWBOX_RE =
  /width="250"\s*height="250"\s*viewBox="0 0 250 250"/;
const LOGO_WORDMARK_VIEW =
  'width="250" height="80" viewBox="0 82 250 80" preserveAspectRatio="xMidYMid meet"';

export function loadLogoImage(): Promise<HTMLImageElement | null> {
  const svg = logoSvgRaw.replace(LOGO_DIMENSION_VIEWBOX_RE, LOGO_WORDMARK_VIEW);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
