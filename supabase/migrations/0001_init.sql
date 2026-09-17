-- SyncUp initial schema (PRD section 41).
-- Run via the Supabase SQL editor, or `supabase db push` once the CLI is linked.

create extension if not exists "pgcrypto";

-- ── users ────────────────────────────────────────────────────────────────
-- Optional. MVP participants are guests and never need a row here (PRD section 43).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ── sessions ─────────────────────────────────────────────────────────────
create type session_mode as enum ('COUPLE', 'GROUP');
create type session_category as enum ('WATCH', 'EAT');
create type session_status as enum ('WAITING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid references users(id),
  mode session_mode not null,
  category session_category not null,
  title text,
  duration_seconds integer not null,
  started_at timestamptz,
  expires_at timestamptz,
  status session_status not null default 'WAITING',
  decision_rule text not null default 'sync_score',
  created_at timestamptz not null default now()
);

create index if not exists sessions_code_idx on sessions (code);

-- ── participants ─────────────────────────────────────────────────────────
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid references users(id),
  display_name text not null,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index if not exists participants_session_idx on participants (session_id);

-- ── items ────────────────────────────────────────────────────────────────
-- Category-agnostic candidate content. `metadata` carries category-specific fields
-- (poster/runtime/genres for movies, price level/address for restaurants, etc.)
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  category session_category not null,
  external_id text not null,
  source text not null,
  title text not null,
  description text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, source, external_id)
);

-- ── session_items ────────────────────────────────────────────────────────
create table if not exists session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  item_id uuid not null references items(id),
  position integer not null,
  batch_number integer not null default 1,
  created_at timestamptz not null default now(),
  unique (session_id, item_id)
);

create index if not exists session_items_session_idx on session_items (session_id);

-- ── swipes ───────────────────────────────────────────────────────────────
create type swipe_direction as enum ('SYNC', 'PASS');

create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  item_id uuid not null references items(id),
  direction swipe_direction not null,
  created_at timestamptz not null default now(),
  unique (session_id, participant_id, item_id)
);

create index if not exists swipes_session_idx on swipes (session_id);

-- ── matches ──────────────────────────────────────────────────────────────
-- Computed results, written server-side once a session completes.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  item_id uuid not null references items(id),
  sync_score numeric not null,
  participant_count integer not null,
  liked_count integer not null,
  rank integer not null,
  created_at timestamptz not null default now(),
  unique (session_id, item_id)
);

create index if not exists matches_session_idx on matches (session_id);

-- ── Row Level Security ──────────────────────────────────────────────────
-- Guests have no Supabase Auth identity (PRD section 43), so these policies
-- are deliberately permissive on join/create/progress. The one privacy rule
-- the PRD is explicit about (section 27: no participant may see another
-- participant's individual choices during an active session) is enforced
-- here at the database level, not just hidden in the UI.

alter table sessions enable row level security;
alter table participants enable row level security;
alter table items enable row level security;
alter table session_items enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;

create policy "sessions are readable by anyone with the code" on sessions
  for select using (true);
create policy "anyone can create a session" on sessions
  for insert with check (true);
create policy "anyone can update session state" on sessions
  for update using (true);

create policy "participants are readable within a session" on participants
  for select using (true);
create policy "anyone can join a session" on participants
  for insert with check (true);
create policy "participants can update their own activity" on participants
  for update using (true);

create policy "items are publicly readable" on items
  for select using (true);
-- No insert/update policy for items or session_items: they're populated by
-- the server-side service layer using the Supabase service role key, which
-- bypasses RLS. The anon/browser client never writes candidate content.

create policy "session_items are publicly readable" on session_items
  for select using (true);

-- Swipes: a participant may always insert their own swipe on an ACTIVE session,
-- but may only ever SELECT swipe rows once the session has left ACTIVE state.
-- This is what keeps everyone's choices private mid-session at the DB layer.
create policy "swipes are insertable while a session is active" on swipes
  for insert with check (
    exists (
      select 1 from sessions
      where sessions.id = swipes.session_id
        and sessions.status = 'ACTIVE'
    )
  );

create policy "swipes are readable only after the session leaves ACTIVE" on swipes
  for select using (
    exists (
      select 1 from sessions
      where sessions.id = swipes.session_id
        and sessions.status <> 'ACTIVE'
    )
  );

create policy "matches are publicly readable" on matches
  for select using (true);
-- No insert/update policy for matches: written by the server-side matching
-- service (service role) once a session completes.

-- ── Progress without leaking choices ────────────────────────────────────
-- The swipes SELECT policy above blocks reading individual swipe rows while
-- a session is ACTIVE, which is correct for privacy but also blocks the
-- waiting-room-style progress view ("Neeraj — 23/50") that PRD section 28
-- asks for. This function returns only aggregate counts (never item_id or
-- direction) and runs as security definer so it can read swipes regardless
-- of the caller's RLS grants — it is the one sanctioned way to learn
-- anything about swipe activity mid-session.
create or replace function session_progress(p_session_id uuid)
returns table (
  participant_id uuid,
  display_name text,
  swipe_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as participant_id,
    p.display_name,
    count(s.id) as swipe_count
  from participants p
  left join swipes s
    on s.participant_id = p.id and s.session_id = p.session_id
  where p.session_id = p_session_id
  group by p.id, p.display_name;
$$;

grant execute on function session_progress(uuid) to anon, authenticated;
