import { defineMiddleware } from "astro:middleware";
import llmsBody from "./data/llms.txt?raw";
import { SECTION_SLUGS } from "./data/section-routes";

type SectionSlug = (typeof SECTION_SLUGS)[number];

const TRAILING_SLASH_PATH = /\/$/;

function stripTrailingSlash(pathname: string): string {
  if (pathname.length <= 1) {
    return pathname || "/";
  }
  const s = pathname.replace(TRAILING_SLASH_PATH, "");
  return s === "" ? "/" : s;
}

function isLandingDocumentPath(pathname: string): boolean {
  const p = stripTrailingSlash(pathname);
  if (p === "/") {
    return true;
  }
  const parts = p.slice(1).split("/").filter(Boolean);
  if (parts.length === 0) {
    return true;
  }
  const [a] = parts;
  if (parts.length === 1) {
    return SECTION_SLUGS.includes(a as SectionSlug);
  }
  return false;
}

function shouldServeMarkdownVariant(accept: string | null): boolean {
  if (accept == null || accept === "") {
    return false;
  }
  return accept.toLowerCase().includes("text/markdown");
}

function shouldAttachLlmsDiscovery(pathname: string): boolean {
  const p = stripTrailingSlash(pathname);
  if (p.startsWith("/api/")) {
    return false;
  }
  if (p === "/llms.txt" || p === "/sitemap.xml") {
    return false;
  }
  return true;
}

function mergeVary(existing: string | null, token: string): string {
  if (!existing?.trim()) {
    return token;
  }
  const parts = existing
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.includes(token)) {
    return existing;
  }
  return `${existing}, ${token}`;
}

const LLMS_TXT_DISCOVERY_LINK = '</llms.txt>; rel="llms-txt"';

const MARKDOWN_NEGOTIATION_HEADERS: Record<string, string> = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Accept",
};

function withLlmsDiscoveryHeaders(
  response: Response,
  pathname: string
): Response {
  const headers = new Headers(response.headers);
  const existingLink = headers.get("Link");
  headers.set(
    "Link",
    existingLink
      ? `${existingLink}, ${LLMS_TXT_DISCOVERY_LINK}`
      : LLMS_TXT_DISCOVERY_LINK
  );
  headers.set("X-Llms-Txt", "/llms.txt");
  if (isLandingDocumentPath(pathname)) {
    headers.set("Vary", mergeVary(headers.get("Vary"), "Accept"));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  const method = request.method;
  const path = new URL(request.url).pathname;

  if (method !== "GET" && method !== "HEAD") {
    return next();
  }

  if (
    isLandingDocumentPath(path) &&
    shouldServeMarkdownVariant(request.headers.get("accept"))
  ) {
    if (method === "HEAD") {
      return new Response(null, { headers: MARKDOWN_NEGOTIATION_HEADERS });
    }
    return new Response(llmsBody, { headers: MARKDOWN_NEGOTIATION_HEADERS });
  }

  const response = await next();
  if (
    (method === "GET" || method === "HEAD") &&
    shouldAttachLlmsDiscovery(path)
  ) {
    return withLlmsDiscoveryHeaders(response, path);
  }
  return response;
});
