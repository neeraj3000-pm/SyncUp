-- Sprint 2: join flow, waiting room, realtime participants, session start (PRD sections 18-31).

-- ── guest identity on participants ──────────────────────────────────────
-- Guests have no Supabase Auth session (PRD section 43), so we can't rely on
-- auth.uid() to recognize "the same browser" across a page refresh or a
-- rejoin. Instead the client keeps a locally-stored guest id (lib/guest.ts)
-- and sends it along when joining; storing it here lets a refresh or a
-- second visit to the same join link resolve back to the same participant
-- row instead of creating a duplicate.
alter table participants add column if not exists guest_id text;

-- One participant row per (session, guest) — a rejoin should find the
-- existing row, never create a second one.
create unique index if not exists participants_session_guest_idx
  on participants (session_id, guest_id)
  where guest_id is not null;

-- ── creator identity on sessions ────────────────────────────────────────
-- `creator_id` (PRD section 41) points at the optional `users` table, but
-- MVP creators are guests too. This mirrors participants.guest_id so the
-- app can tell "is this browser the one that started this session" (for
-- showing the Start button) without an account system.
alter table sessions add column if not exists creator_guest_id text;

-- ── Realtime ─────────────────────────────────────────────────────────────
-- The waiting room needs live participant joins and the session status/timer
-- flip to ACTIVE (PRD section 44). Add both tables to the default Supabase
-- Realtime publication; RLS select policies (already permissive on both)
-- continue to govern what a subscriber actually receives.
-- Guarded because `alter publication ... add table` errors if the table is
-- already a member (e.g. a project where it was added by hand already).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table sessions;
  end if;
end $$;
