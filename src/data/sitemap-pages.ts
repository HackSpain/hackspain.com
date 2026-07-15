const SECTIONS = ["mission", "tracks", "apuntate"] as const;

const TRAILING_SLASHES = /\/+$/;

export const SITEMAP_SITE_ORIGIN = "https://hackspain.com";

function normalizeSitemapPageUrl(href: string): string {
  const u = new URL(href);
  if (u.pathname === "/" || u.pathname === "") {
    return u.origin;
  }
  return `${u.origin}${u.pathname.replace(TRAILING_SLASHES, "")}`;
}

/** Every indexable HTML URL (full origin URLs). */
export function getAllSitemapPageUrls(): string[] {
  const o = SITEMAP_SITE_ORIGIN;
  const raw = [
    o,
    ...SECTIONS.map((s) => `${o}/${s}`),
    `${o}/signup`,
    `${o}/ambassador`,
    `${o}/privacy`,
  ];
  return [...new Set(raw.map(normalizeSitemapPageUrl))];
}
