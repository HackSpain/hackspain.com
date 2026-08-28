# Player Market handoff

Player Market lets confirmed HackSpain participants publish a card, receive structured sponsorship offers, and decide which brands they want to represent. Companies can browse published cards without signing in, but must verify a corporate email or use a HackSpain invitation before sending an offer.

This implementation is self-hosted inside HackSpain. It does not depend on the prototype domain and does not process payments.

## Current status

The complete experience is implemented for a future HackSpain edition. It will not be activated for the 2026 event because principal sponsor commitments need to be respected. The code remains usable when the team decides to launch the concept.

The participant directory is maintained as a separate contribution. This branch contains only Player Market.

## What is included

- Public Player Market at `/player-market`.
- Private participant management at `/player-market/manage`.
- Passwordless access through single-use email links.
- Separate identities for participants and companies.
- Participant-controlled profile publication and visibility.
- Structured offers with sponsorship type, reward, deliverables, and message.
- Offer states: `sent`, `negotiating`, `accepted`, `rejected`, and `expired`.
- An append-only event history for offer changes.
- Automatic publication of accepted agreements in Fichajes live.
- A generated Open Graph image at `/api/og/player-market.png`.

## Run it locally

### Prerequisites

- Node.js 22.12 or later.
- pnpm 10.x.
- A PostgreSQL database reachable through `DATABASE_URL`.
- At least one signup with `approval_status = 'confirmed'` to exercise participant access.

### 1. Install and configure the repository

```sh
pnpm install
cp .env.example .env
```

Set at least:

```dotenv
DATABASE_URL=postgresql://...
```

Player Market adds no new environment variables. Production email delivery reuses:

```dotenv
RESEND_API_KEY=...
RESEND_FROM="HackSpain <noreply@updates.hackspain.com>"
```

In development, a valid magic-link request returns a direct debug URL and the browser follows it automatically. Resend is therefore optional for local flow testing.

### 2. Apply the schema

Migration `drizzle/0022_shiny_eternity.sql` creates the Player Market tables.

```sh
pnpm db:migrate
```

Use a development database first. Review and back up production data before applying any schema migration in a deployed environment.

### 3. Start the site

```sh
pnpm dev
```

Open [http://localhost:4321/player-market](http://localhost:4321/player-market).

### 4. Exercise the participant flow

1. Open `/player-market/manage`.
2. Enter the email of a confirmed HackSpain participant.
3. Follow the development magic link.
4. Complete role, city, skills, lore, and sponsorship preferences.
5. Publish the profile.
6. Confirm that its generated card appears at `/player-market`.

Only published profiles appear publicly. Saving without publishing keeps a new profile as a draft; saving without publishing after publication hides it.

### 5. Exercise the company and offer flow

1. Open the published participant card.
2. Start an offer.
3. Identify the company with a corporate-looking email address. Common personal email domains are rejected unless a valid HackSpain invitation token is supplied.
4. Follow the development magic link.
5. Choose `Equipado por`, `Construido con`, or `Team sponsor`.
6. Describe what the participant receives and what the company requests.
7. Send the offer.
8. Return to the participant management page and accept, reject, or negotiate it.
9. Accept the offer and confirm that it appears in Fichajes live.

No payment is captured. Player Market records the agreement and its state; settlement happens outside the product.

## Routes

### Pages

| Route | Access | Purpose |
| :---- | :----- | :------ |
| `/player-market` | Public | Cards, sponsorship formats, company offer flow, and Fichajes live |
| `/player-market/manage` | Participant session | Edit, publish, or hide a profile and manage received offers |
| `/api/og/player-market.png` | Public | Generated 1200 × 630 social image |

### API

| Method and route | Principal | Purpose |
| :--------------- | :-------- | :------ |
| `POST /api/player-market/access/request` | Public | Request participant or company access without revealing account eligibility |
| `GET /api/player-market/access/exchange?token=…` | Magic link | Consume a single-use token and create a session |
| `POST /api/player-market/logout` | Authenticated session | Revoke the current session |
| `PATCH /api/player-market/profile` | Participant | Update, publish, or hide the participant profile |
| `POST /api/player-market/offers` | Company | Send an offer to a published, available participant |
| `POST /api/player-market/offers/:id/decision` | Target participant | Accept, reject, or negotiate an active offer |

Mutation endpoints accept same-origin JSON requests and return responses with `Cache-Control: no-store`.

## Data model

Migration `0022_shiny_eternity` adds seven tables:

| Table | Purpose |
| :---- | :------ |
| `player_market_profiles` | Public-safe profile fields, consent, publication state, and availability |
| `player_market_companies` | Verified company identities |
| `player_market_company_invites` | Single-use invitation exceptions for company access |
| `player_market_magic_links` | Hashed, expiring participant and company access links |
| `player_market_sessions` | Hashed participant and company sessions |
| `player_market_offers` | Sponsorship format, reward, deliverables, message, expiry, and current state |
| `player_market_offer_events` | Append-only history of offer creation and state changes |

Participant profiles reference `hackathon_signups` through `signup_id`. A draft is created only after a confirmed participant requests access. Existing signup data is used as private prefill, not published directly.

## Privacy boundary

The public roster query exposes only fields that belong on a published card:

- Display name.
- Role and city.
- Bio and player lore.
- Skills and accepted sponsorship formats.
- Availability.
- Public slug.
- Selected badge photo.

Fichajes live exposes the participant name, company, sponsorship format, agreed reward summary, and acceptance date.

Never expose signup email, application answers, dietary information, referral data, internal review notes, raw signup IDs, magic-link tokens, or session tokens. The `92 BUILD` number is visual presentation only and must never be derived from application or shortlist scores.

## Authentication and authorization

- Access links use 32 random bytes.
- Only a SHA-256 hash is stored.
- Links expire after 30 minutes and are consumed atomically once.
- Sessions use a separate random token, stored only as a hash.
- Sessions expire after seven days.
- Production cookies are HTTP-only, secure, and same-site `lax`.
- Participant sessions are scoped to one signup.
- Company sessions are scoped to one verified company.
- Only the participant targeted by an offer can decide it.
- Access requests return the same public response whether or not the email is eligible.

## Offer and profile states

```text
Profile: draft -> published -> hidden
                     ^          |
                     +----------+

Offer: sent -> negotiating -> accepted
          |           |          |
          +-----------+----------+-> rejected
          +-------------------------> expired
```

Accepted and rejected offers are terminal. An accepted offer is read automatically by the public Fichajes live query.

## Production checklist

Before exposing the routes publicly:

1. Confirm that the sponsorship concept and positioning are compatible with current sponsor agreements.
2. Review the public data contract and participant consent language.
3. Back up the database and apply migration `0022_shiny_eternity` through the normal deployment process.
4. Confirm `DATABASE_URL`, `RESEND_API_KEY`, and `RESEND_FROM` in the hosted environment.
5. Verify the Resend sending domain and run participant and company email tests.
6. Add rate limiting at the deployment edge for `/api/player-market/access/request`.
7. Test that unpublished profiles and non-target offer details remain private.
8. Test participant publish, hide, negotiate, accept, reject, logout, and expired-link paths.
9. Link `/player-market` from the public navigation only after the preceding checks pass.

Removing a navigation link is enough to stop discovery of the feature, but it is not an authorization boundary. Keep the server-side access checks in place even when the feature is not linked publicly.

## Known limits

- There is no payment, invoicing, or settlement system.
- There is no organizer administration UI.
- Company invitation storage and consumption exist, but invitation creation is not exposed through an organizer screen.
- Offers store an expiry date, but no scheduled job currently converts elapsed offers to `expired`.
- Access-request rate limiting must be added at the deployment edge before public launch.
- The public card score is presentational rather than a participant ranking.

## Verification

Run the focused state and authorization tests:

```sh
pnpm test:player-market
```

Build the production server bundle:

```sh
pnpm build
```

Expected manual checks:

- `/player-market` returns the public experience.
- `/player-market/manage` shows email access without a participant session.
- `/api/og/player-market.png` returns an `image/png` response.
- A published profile appears without a code change.
- An accepted offer appears in Fichajes live.

## Troubleshooting

### The public roster is empty

Confirm that migration `0022_shiny_eternity` has run and at least one profile has `status = 'published'`. Confirmed signups do not appear automatically; each participant must access and publish a separate profile.

### A participant does not receive access

Confirm that the email matches a `hackathon_signups` record whose `approval_status` is `confirmed`. In production, also verify `RESEND_API_KEY`, `RESEND_FROM`, and the sending-domain status.

### A company email is rejected

Common personal email domains require a valid HackSpain invitation. Use a corporate domain or supply an unconsumed, unexpired invitation token for the exact email address.

### A magic link redirects to `access=invalid`

The token is malformed, expired, already consumed, or missing from the database. Request a new link. Links last 30 minutes and work once.

### The page loads but no database-backed content appears

Check `DATABASE_URL`, database connectivity, and the migration journal. The public route intentionally falls back to an empty roster if its data query fails.

## Related documentation

- [Player Market product scope](develop/player-market.md)
- [Player Market design](designs/player-market.md)
- [Repository setup](../README.md)
