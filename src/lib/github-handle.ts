/** GitHub's own rule: alphanumeric or single hyphens, up to 39 characters. */
const GITHUB_HANDLE_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const WWW_PREFIX_RE = /^www\./;

/**
 * Signups store a normalized profile URL, so the handle has to be read back out
 * of it. Anything that is not a plain github.com/<handle> profile — a gist, a
 * project page, a repository path — has no avatar to show.
 */
export function githubHandleFromUrl(
  githubUrl: string | null | undefined
): string | null {
  if (!githubUrl) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(githubUrl);
  } catch {
    return null;
  }

  if (parsed.hostname.replace(WWW_PREFIX_RE, "") !== "github.com") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 1) {
    return null;
  }

  return GITHUB_HANDLE_RE.test(segments[0]) ? segments[0] : null;
}

export function isGithubHandle(value: string): boolean {
  return GITHUB_HANDLE_RE.test(value);
}
