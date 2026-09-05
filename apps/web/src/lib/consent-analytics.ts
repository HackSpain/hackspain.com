import { computeRoute, pageview } from "@vercel/analytics";

/** Fire a Vercel Analytics pageview after the user grants cookie consent. */
export function trackPageviewAfterConsent(): void {
  pageview({
    path: window.location.pathname,
    route: computeRoute(window.location.pathname, null),
  });
}
