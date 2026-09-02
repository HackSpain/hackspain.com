/**
 * Obscure query used to keep a late / UPM signup form working after the public
 * window closed. This is a convenience gate, not an access-control system:
 * anyone who finds the URL can submit, and those applications can still be
 * rejected by hand.
 *
 * Share: `/signup?allow=plaza-upm`
 */
export const SIGNUP_LATE_ACCESS_QUERY = "allow";
export const SIGNUP_LATE_ACCESS_KEY = "plaza-upm";

export function hasValidSignupAccessKey(value: unknown): boolean {
  return typeof value === "string" && value.trim() === SIGNUP_LATE_ACCESS_KEY;
}

export function signupLateAccessKeyFromSearch(search: string): string {
  return (
    new URLSearchParams(search).get(SIGNUP_LATE_ACCESS_QUERY)?.trim() ?? ""
  );
}
