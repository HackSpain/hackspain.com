/**
 * Deadline the landing-page countdown counts down to, after which the signup
 * CTAs switch to a disabled "closed" state.
 *
 * Written with an explicit offset so it never depends on the visitor's — or the
 * server's — timezone. `+02:00` is Madrid time in August (CEST); switch the
 * offset to `+01:00` if the deadline is ever moved past the October DST change.
 */
export const SIGNUP_DEADLINE_ISO = "2026-08-09T23:59:00+02:00";
