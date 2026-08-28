# Design: Player Market Pilot

> Work item: `docs/develop/player-market-pilot.md`
> Backend: local_markdown
> Branch: `txema/player-market-pilot`
> Date: 2026-08-28

> 2026 decision: retain the sponsorship flow as a future concept. The participant-directory UI is maintained as a separate contribution because it does not conflict with principal sponsor commitments.

## Problem (Why)

HackSpain sponsors currently support the event at event level. The pilot tests whether a sponsor will make a small, explicit offer to a specific builder or team while the builder retains control over their identity, public profile and commitments.

## Scope (What)

Build a native HackSpain Player Market using confirmed signup data only as a private prefill. Players publish a separate consented profile through an expiring email link. Company representatives verify their email before sending structured offers. The player can accept, reject or negotiate. Accepted offers populate a public live feed.

Not in scope: payments, automated invoicing, public access to signup records, scoring players from application answers, open self-registration for unverified attendees, or a general HackSpain account system.

## User Experience

### Player

1. Receives “Activa tu ficha de Player Market” at the email used for HackSpain.
2. Opens a single-use link and lands in a private editing session.
3. Sees existing name, photo and public links as a prefill, clearly labelled “solo tú puedes ver esto”.
4. Adds role, city, skills, lore and sponsorship preferences.
5. Reviews a card preview and explicitly publishes it.
6. Receives offers in the same private area, with “qué recibes”, “qué te piden” and the sponsorship format above the decision buttons.
7. Accepts, rejects or proposes a counteroffer. A terminal action is idempotent and cannot be double-submitted.

### Company

1. Browses public, opted-in cards without signing in.
2. Selects a player and starts an offer.
3. Verifies ownership of a work email through a single-use link. An organizer invite can bypass the corporate-domain rule for legitimate exceptions.
4. Completes sponsorship type, compensation, deliverables, conditions and expiry.
5. Sends the offer and sees a stable reference plus its current state.

### Public

1. Sees only published profiles.
2. A newly published profile appears without code changes.
3. An accepted offer appears in Fichajes live with player, company, format and agreed compensation.

## Information Flow

```text
hackathon_signups (private)
        |
        | confirmed + player opens magic link
        v
player_market_profiles (draft, consented public fields only)
        |
        | player publishes
        v
public card / roster -------- company verifies email
        |                              |
        |                              v
        +---------------------- sponsorship_offers (sent)
                                      |
                                      | player decision
                         +------------+-------------+
                         v            v             v
                    negotiating    accepted      rejected
                                      |
                                      v
                              public live feed
```

## State Machines

```text
Profile: draft -> published -> hidden
                     ^          |
                     +----------+

Offer: draft -> sent -> negotiating -> accepted
                   |          |          |
                   +----------+----------+-> rejected
                   +-----------------------> expired
```

Accepted and rejected are terminal. Negotiating creates a new event with the proposed terms; it does not overwrite the original offer.

## Data Boundaries

The public profile can contain display name, role, city, bio, lore, skills, sponsorship preferences, selected photo and public links. Email, dietary restrictions, internal shortlist notes, referral data and application answers remain private.

`fullName`, public links, confirmed status and the selected badge photo can prefill from `hackathon_signups`. Role, city, structured skills, lore, preferences and publish consent must be supplied or confirmed by the player.

## Authentication And Authorization

- Reuse the existing transactional email infrastructure, not a new account provider.
- Generate 32 random bytes for every magic link, store only a SHA-256 digest, expire links after 30 minutes and mark them consumed atomically.
- Exchange a valid link for a random session token stored as a secure, HTTP-only, same-site cookie. Store only its digest and expire the session after seven days.
- Player sessions are scoped to one signup/profile. Company sessions are scoped to one company record.
- Return the same generic response whether or not an email is eligible to avoid account enumeration.
- Rate-limit magic-link requests at the deployment edge before production exposure.

## Buy-vs-build Scan

### Option A: Third-party authentication provider

Complete account management but introduces a new vendor, account model and visual login surface for a ten-player pilot.

### Option B: Astro sessions plus purpose-specific email tokens

Reuses Astro’s request/session model, existing Resend delivery and the repo’s management-token pattern. OWASP guidance supports random, securely stored, single-use expiring URL tokens. This is the selected approach because it fits the pilot and does not create passwords.

### Option C: Reuse the existing long-lived management token directly

Smallest diff, but expands the blast radius of a token already used for confirmation and badge updates. Rejected in favour of isolated, expiring credentials.

## Engineering Plan

1. Add player-market profile, company, magic-link, session, offer and offer-event tables plus constraints.
2. Add token, session and authorization helpers with pure functions that can be unit-tested.
3. Add APIs for magic-link request/exchange, profile update/publish, company verification, offer submission and player decisions.
4. Add Astro routes and React islands for the roster, profile editor, company offer flow and live feed, reusing the existing layout, palette and Bungee/DM Sans fonts.
5. Add email templates and generic success responses.
6. Test validation, privacy projections, token expiry/consumption, principal scoping and offer transitions.

## Interaction States

- Empty roster: explain that profiles appear after participant consent; no fabricated cards.
- Player without a profile: create a private draft from safe signup fields.
- Invalid/expired link: clear recovery action to request a new email.
- Email delivery failure: do not claim success internally; log the named failure while preserving the generic public response.
- Stale offer: reject the transition with a conflict response and show the current state.
- Double click: disable the button while pending and make writes idempotent.
- Long names: clamp card typography and keep the full name accessible.
- Missing photo: use initials, never fetch an untrusted remote image in server-generated markup.

## Rejected Alternatives

- Publishing directly from `hackathon_signups`.
- Password-based accounts.
- Social login for a short pilot.
- Calculating a player rating from application answers.
- Treating local storage as the live source of truth.

## Open Questions

None blocking. Payment collection and organizer administration remain follow-up work after sponsor demand is validated.
