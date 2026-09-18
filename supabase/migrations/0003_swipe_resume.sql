-- Sprint 3: swipe deck. This migration fixes a gap the swipes RLS policy
-- (migration 0001) left open: "swipes are readable only after the session
-- leaves ACTIVE" correctly hides everyone's choices from each other during
-- an active session (PRD section 27), but as written it also hides a
-- participant's OWN swipes from themselves — so refreshing mid-swipe would
-- show already-swiped cards again, and re-swiping one with a different
-- direction would hit the swipes unique constraint.
--
-- This mirrors the session_progress() function from migration 0001: a
-- security-definer RPC that can read swipes regardless of the caller's RLS
-- grants, but only returns the rows for the one participant_id passed in.
-- Guests have no Supabase Auth identity, so — same trust model as the rest
-- of the MVP (guest_id, creator_guest_id) — the caller's participant_id is
-- taken as given rather than cryptographically verified.
create or replace function get_my_swipes(p_session_id uuid, p_participant_id uuid)
returns table (
  item_id uuid,
  direction swipe_direction
)
language sql
security definer
set search_path = public
as $$
  select s.item_id, s.direction
  from swipes s
  where s.session_id = p_session_id
    and s.participant_id = p_participant_id;
$$;

grant execute on function get_my_swipes(uuid, uuid) to anon, authenticated;

-- ── voluntary completion (PRD section 29) ───────────────────────────────
-- "I'm Done" needs somewhere to record that a participant stopped
-- voluntarily, distinct from just having a swipe_count. Without this, the
-- progress view (PRD section 28's "Rahul — Done") has no way to
-- distinguish "finished early" from "still swiping" other than counting,
-- which breaks the moment someone finishes with fewer than the full pool.
alter table participants add column if not exists finished_at timestamptz;

-- session_progress() (migration 0001) needs to return finished_at too, which
-- changes its return type — CREATE OR REPLACE can't do that, so drop first.
drop function if exists session_progress(uuid);

create function session_progress(p_session_id uuid)
returns table (
  participant_id uuid,
  display_name text,
  swipe_count bigint,
  finished_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as participant_id,
    p.display_name,
    count(s.id) as swipe_count,
    p.finished_at
  from participants p
  left join swipes s
    on s.participant_id = p.id and s.session_id = p.session_id
  where p.session_id = p_session_id
  group by p.id, p.display_name, p.finished_at;
$$;

grant execute on function session_progress(uuid) to anon, authenticated;
