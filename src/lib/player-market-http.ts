const JSON_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

export function playerMarketJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: JSON_RESPONSE_HEADERS,
    status,
  });
}

function isPlayerMarketJsonRequest(request: Request): boolean {
  return (
    request.headers.get("content-type")?.split(";")[0]?.trim() ===
    "application/json"
  );
}

export function hasPlayerMarketSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return import.meta.env.DEV;
  }
  return origin === new URL(request.url).origin;
}

export async function readPlayerMarketJson(
  request: Request
): Promise<unknown | null> {
  if (!isPlayerMarketJsonRequest(request)) {
    return null;
  }
  try {
    return await request.json();
  } catch {
    return null;
  }
}
