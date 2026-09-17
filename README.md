# SyncUp

**Stop debating. SyncUp.**

A mobile-first PWA that helps 2–10 people quickly agree on what to watch or where to eat. Everyone swipes independently on the same candidate pool within a time limit; SyncUp surfaces the highest-agreement result and hands off to the service that actually fulfills it (Netflix, Maps, etc).

Full spec: [`docs/PRD.md`](docs/PRD.md). Project conventions and architecture notes for contributors (human or Claude Code): [`CLAUDE.md`](CLAUDE.md).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Realtime), deployed on Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL/keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Database schema lives in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — run it against your Supabase project via the SQL editor or the Supabase CLI.

## Status

Sprint 1 (foundation): project setup, design tokens, DB schema, session creation ✅
Sprint 2 (session): join flow, realtime waiting room, session start, server-authoritative timer ✅
Sprint 3+ (swipe deck, matching, restaurants, polish): in progress — see `CLAUDE.md` for the full build order.
