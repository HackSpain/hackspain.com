---
title: "Player Market"
source: local_markdown
stage: Build
priority: P1
size: L
pr:
created_at: 2026-08-28
updated_at: 2026-08-28
---

# Player Market

## Current outcome

The sponsorship flow will not be activated for the 2026 edition because HackSpain already has principal sponsor commitments. The branch remains a complete, self-hostable product proposal for a future edition. The participant-directory UI has been split into a separate contribution and is outside this branch's scope.

## Why

Test whether HackSpain sponsors want to make small, explicit sponsorship offers to individual builders or teams, while builders retain control over what they represent and accept.

## What

Adapt the validated Player Market prototype to HackSpain's existing Astro and React architecture as an opt-in feature backed by real profiles and offers. Confirmed participants receive a private magic link to review and publish their card. Company representatives verify a work email before sending an offer. Accepted offers appear in the live transfer feed.

## Acceptance Criteria

- [x] A confirmed HackSpain signup can receive a purpose-specific, expiring magic link without creating a password.
- [x] The player can review prefilled data, complete role, city, skills, lore and sponsorship preferences, then explicitly publish or hide the profile.
- [x] Public pages read only consented fields from a separate player-market profile table, never directly expose private signup fields.
- [x] A company representative can verify a corporate email, create a company identity and submit an offer to a published player.
- [x] Offers persist with sent, negotiating, accepted and rejected states and keep an append-only event history.
- [x] Only the target player can accept, reject or negotiate an offer.
- [x] Accepted offers automatically appear in the public live feed.
- [x] The public card is generated from the published profile and handles missing photos and long names.
- [x] Tokens are random, hashed at rest, single-use and expiring; authenticated sessions use secure HTTP-only cookies.
- [x] The new flow has validation, accessible error/empty/success states and tests for authorization and state transitions.

## Context

- The adaptation must use HackSpain's existing visual language, components, and project conventions.
- The official implementation is self-contained and has no dependency on the prototype host.
- Builder tracks are not shown until participants have actually selected them.
- Sponsorship offers distinguish sponsorship type, compensation, and what the builder agrees to do.
- The official site uses Astro 6 pages with React 19 islands, Tailwind CSS 4, and the shared `Layout` component.
- Existing standalone product pages use a thin Astro route that mounts one focused React page component.
- HackSpain already exposes reusable palette, typography, grain, button, and panel primitives that can replace the prototype's copied CSS shell.
- Existing signup records contain private applicant data. A first contribution must not turn those records into public profiles without explicit participant opt-in and a reviewed data model.
- The repository has no open issue for this concept, so this local work item is the temporary source of truth.
- The user approved holding the validated standalone experience as the scope baseline and building the complete Player Market flow on 2026-08-28.
- Existing infrastructure already provides Neon, Drizzle, Resend and per-signup management links. Player Market reuses those patterns without adding a password or third-party identity provider.
- `92 BUILD` remains presentation-only demo content and is not inferred from private signup answers.

## Implementation Notes

- Default branch: `master`.
- Durable design: `docs/designs/player-market.md`.
- Player Market data lives in dedicated tables linked to `hackathon_signups`; public queries never select email, dietary data or internal review notes.
- Purpose-specific magic links exchange once for an HTTP-only session. Raw tokens are never stored.
- Company access verifies work-email ownership. A purpose-specific invite can allow an address that does not pass the corporate-domain check.
- The existing standalone site remains live and separate while this branch is reviewed.

## AI Lifecycle


## Handoff

- Operational guide: `docs/player-market-handoff.md`.
- Full concept: review the complete branch. It mounts at `/player-market` and `/player-market/manage` on HackSpain's own deployment.
- The full concept requires migration `0022_shiny_eternity`.
- No payment processing is included. Accepted offers record an agreement and update the live feed.
