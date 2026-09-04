/**
 * Moment the landing-page countdown counts down to — opening of HackSpain 2026.
 *
 * Written with an explicit offset so it never depends on the visitor's — or the
 * server's — timezone. `+02:00` is Madrid time in September (CEST); switch the
 * offset to `+01:00` if the start is ever moved past the October DST change.
 */
const EVENT_START_ISO = "2026-09-18T17:00:00+02:00";

export const EVENT_START_MS = new Date(EVENT_START_ISO).getTime();
