export type { UrlEntry, UrlKind } from "@convex/lib/urls";
export { urlOf } from "@convex/lib/urls";
import type { UrlKind } from "@convex/lib/urls";

const LABELS: Record<UrlKind, string> = {
  x: "X",
  linkedin: "LinkedIn",
  github: "GitHub",
  web: "Web",
  repo: "Repo",
  demo: "Demo",
};

export function urlLabel(kind: UrlKind): string {
  return LABELS[kind];
}
