# SyncUp — Context for Claude Code

**Tagline:** Stop debating. SyncUp.
**What it is:** A mobile-first PWA that helps 2–10 people quickly agree on what to watch or where to eat. Everyone swipes right (Sync) or left (Pass) on the same candidate pool, independently and privately, within a time limit. Results are ranked by Sync Score (agreement %). SyncUp is the decision layer — it hands off to streaming/maps/booking services for the actual action, it doesn't fulfill it.

Full PRD: see `docs/PRD.md` in this repo (copied in verbatim — treat it as ground truth for scope, copy, and data model; don't re-derive decisions it already made).

## Who this is for

Built by **Neeraj P**, a Product Manager (Planetcast Media Services), as a portfolio "proof of work" artifact — something clickable/interactive, not just a case-study writeup. Once live, it links back from his portfolio (`neeraj-portfolio-orcin.vercel.app`). He's learning the git/GitHub workflow deliberately — explain git actions in plain language, show diffs before committing where the change is non-trivial.

## Stack (decided in the PRD, don't relitigate)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS v4, mobile-first
- **Backend/DB:** Supabase (Postgres + Realtime). No custom backend server.
- **Hosting:** Vercel
- **PWA:** installable where supported. No native Android/iOS app in MVP — that's Phase 5, and would use Capacitor to wrap this same PWA rather than a rewrite.
- **Movie data provider:** TMDB (The Movie Database) — free API, has posters/cast/genres/ratings and a `/watch/providers` endpoint for India streaming availability (Netflix/Prime/JioHotstar). Not named explicitly in the PRD, chosen during implementation.
- **Restaurant data provider:** Google Places API (per Neeraj's choice during scoping).

## Product principles (from PRD section 4 — keep enforcing these)

- Frictionless, not rudimentary — hide complexity, don't remove functionality.
- One obvious primary action per screen.
- 10-second rule: a first-time creator understands SyncUp and starts a session in ~10s; a joiner opens link → enters name → joins in ~5-10s. No account, ever, for participants.
- No gamification for its own sake — no XP/points/streaks/leaderboards/badges. The decision itself is the game mechanic.
- No Maybe — only Sync or Pass. Keeps matching unambiguous.
- Individual swipe choices are private during an active session; only join/progress/done status is visible to other participants.

## MVP scope

Categories: **Watch** (movies) + **Eat** (restaurants). Modes: **Couple** (exactly 2) and **Group** (3–10). Explicitly OUT of scope for MVP: native apps, user profiles/accounts, social feed, chat, AI recommendations, subscriptions, ads, in-app streaming/ordering/booking fulfillment, push notifications, advanced gamification. See PRD section 7 for the full non-goals list — if a request sounds like one of these, flag it rather than building it silently.

## Data model (PRD section 41 — implement exactly this shape)

`users` (optional, guests need none) → `sessions` (code, mode, category, duration, status: WAITING/ACTIVE/COMPLETED/EXPIRED/CANCELLED) → `participants` (guest or user, per session) → `items` (category-agnostic content: movies or restaurants, external_id + source + metadata JSON) → `session_items` (which items are in which session's candidate pool, batched) → `swipes` (participant_id + item_id + direction SYNC/PASS, unique per session+participant+item) → `matches` (computed Sync Score results per session).

Sync Score = `liked_count / participant_count × 100`. Rank by: highest score → unanimous first → content rating → deterministic tie-break (never let results reorder on refresh).

## Architecture rule: category-agnostic core

Movies and restaurants are just two `items.category` values flowing through the same session/swipe/matching pipeline. Don't hardcode "movie" logic into session/matching code — keep provider-specific logic behind `/services/movies`, `/services/restaurants`, etc., normalized into a common shape before hitting the UI or the matching engine. This is so Phase 3+ categories (Play/Go/Do/Listen/Read) can reuse the same infrastructure.

## Realtime

Supabase Realtime drives: participant joining/leaving, progress, completion, session start, and reveal. Timer is **server-authoritative** — store `started_at`/`expires_at` on the session row, client computes remaining time from server time, never trust a client-side-only countdown.

## Security

External API keys (TMDB, Google Places, Supabase service role) live in server-side env vars only, never shipped to the client. UI never calls external provider APIs directly — always through a `/services/*` layer that runs server-side.

## Design system

Palette: SyncUp Orange/Coral (primary — CTAs, Sync actions), Electric Purple (secondary — sparingly, gradients/reveal moments), Branded Green (Sync/agreement states only). Warm off-white light theme (not pure white), deep midnight dark theme (not pure black). Font: Manrope (fallbacks: Plus Jakarta Sans, DM Sans, Inter). Avoid: generic SaaS look, Tinder-clone look, over-gamified kids'-app look. Respect `prefers-reduced-motion`.

## Build order (from PRD — follow this sequence, don't skip ahead)

1. Foundation: project setup, design tokens, responsive shell, DB schema, session creation, guest identity
2. Session: join flow, waiting room, realtime participants, session start, timer
3. Swipe: decision card, swipe interaction, like/pass storage, 50-item candidate pool, progress
4. Matching: reveal, Sync Score, result ranking, result detail, external action links
5. Food: location, restaurant provider, restaurant card/details/actions
6. Polish: animations, dark/light themes, QR, error states, accessibility, analytics, PWA install

**First real milestone (not the whole platform):** two people on two phones can create and join a SyncUp, independently swipe through the same movie pool, and get a shared result — end to end, polished, before touching restaurants.

## Folder structure

```
/app
  /page.tsx        landing
  /create           category/timer selection
  /join/[code]      join flow
  /session/[id]     waiting room + swipe deck
  /results/[id]     reveal + results
/components
  DecisionCard, MovieCard, RestaurantCard, ParticipantList,
  SessionTimer, SwipeDeck, ResultCard, SyncScore, QRModal, DetailSheet
/services
  /movies /streaming /restaurants /location /matching /sessions
/lib
  supabase client helpers, guest identity, session code generator
```
