/**
 * Obscure query used to keep a late signup form working after the public
 * window closed. This is a convenience gate, not an access-control system:
 * anyone who finds a URL can submit, and those applications can still be
 * rejected by hand.
 *
 * Share: `/signup?allow=plaza-upm` (UPM) or `/signup?allow=misc`
 * (miscellaneous invites). The key is not stored on the signup row, so pick
 * per-channel keys only for the link's sake, not for attribution.
 */
export const SIGNUP_LATE_ACCESS_QUERY = "allow";
export const SIGNUP_LATE_ACCESS_KEYS: readonly string[] = ["plaza-upm", "misc"];

export function hasValidSignupAccessKey(value: unknown): boolean {
  return (
    typeof value === "string" && SIGNUP_LATE_ACCESS_KEYS.includes(value.trim())
  );
}

export function signupLateAccessKeyFromSearch(search: string): string {
  return (
    new URLSearchParams(search).get(SIGNUP_LATE_ACCESS_QUERY)?.trim() ?? ""
  );
}
