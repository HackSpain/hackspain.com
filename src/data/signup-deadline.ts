/**
 * Deadline the landing-page countdown counts down to, after which the signup
 * CTAs switch to a disabled "closed" state and `POST /api/signup` stops
 * accepting applications.
 *
 * Written with an explicit offset so it never depends on the visitor's — or the
 * server's — timezone. `+02:00` is Madrid time in August (CEST); switch the
 * offset to `+01:00` if the deadline is ever moved past the October DST change.
 */
const SIGNUP_DEADLINE_ISO = "2026-08-09T23:59:00+02:00";

export const SIGNUP_DEADLINE_MS = new Date(SIGNUP_DEADLINE_ISO).getTime();

/**
 * Whether the signup window has closed. The single source of truth for the
 * countdown, the CTAs, the page copy and the API gate — a visitor's clock only
 * decides what the browser shows; `/api/signup` re-checks it server-side.
 */
export function areSignupsClosed(now: number = Date.now()): boolean {
  return now >= SIGNUP_DEADLINE_MS;
}
