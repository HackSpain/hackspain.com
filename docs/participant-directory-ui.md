# Participant directory UI

The directory is deliberately independent from Player Market. It has no database, authentication, offer or sponsor dependencies, so it can be adopted on its own.

It is the first commit in the Player Market branch, so it can be cherry-picked without taking any marketplace code.

## Files to take

- `src/components/participant-directory/participant-directory.tsx`
- `src/components/participant-directory/participant-directory.css`
- `src/components/participant-directory/types.ts`
- `src/components/participant-directory/index.ts`

## Data contract

Pass only fields that each participant has agreed to make public:

```ts
import type { DirectoryParticipant } from "../components/participant-directory";

const participants: DirectoryParticipant[] = [
  {
    id: "public-stable-slug",
    displayName: "Laura Martín",
    role: "AI Engineer",
    city: "Madrid",
    skills: ["LLM", "Python", "Agents"],
    bio: "Construye agentes que pasan del notebook a producción.",
    lore: "Convierte una demo de madrugada en producto antes del desayuno.",
    photoUrl: "/public-safe-photo.jpg",
    featured: true,
  },
];
```

Never use an email or a private signup identifier as `id`. The component does not need email, application answers, dietary information or review scores.

## Astro page

Once the server has produced that public-safe array, the page is one component:

```astro
---
import { ParticipantDirectory } from "../components/participant-directory";
import Layout from "../layouts/layout.astro";
import { listPublicParticipants } from "../lib/your-participant-source";

const participants = await listPublicParticipants();
---

<Layout allowScroll title="Participantes — HackSpain 2026">
  <ParticipantDirectory client:load {participants} />
</Layout>
```

The data source is intentionally the only integration point. Search, cards, featured card, shareable `?participant=...` URLs, modal profiles, empty states and responsive behaviour are already included.

## Minimal adoption checklist

1. Cherry-pick the first commit from the branch.
2. Add the Astro page above at the route the team chooses, for example `/participantes`.
3. Map the existing public, consented participant data to `DirectoryParticipant[]`.
4. Do not pass emails, application answers, internal scores or private database IDs.

No schema migration, environment variable, login flow or Player Market route is required.
