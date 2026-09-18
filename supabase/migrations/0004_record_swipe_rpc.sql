-- Sprint 3 follow-up. The swipes INSERT policy (migration 0001) checks
-- session status via a cross-table exists() subquery in WITH CHECK, and
-- that pattern turned out to fail specifically when executed through
-- PostgREST/Supavisor (parameterized queries via the pooled connection),
-- even though the identical insert succeeds as a plain literal SQL
-- statement and as role `anon` directly. Rather than chase that interaction
-- further, this moves swipe-recording onto the same security-definer RPC
-- pattern already proven reliable through the real API by session_progress
-- and get_my_swipes (migration 0001/0003) — the function does its own
-- ACTIVE-session check in PL/pgSQL instead of leaning on RLS for it.
create or replace function record_swipe(
  p_session_id uuid,
  p_participant_id uuid,
  p_item_id uuid,
  p_direction swipe_direction
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from sessions
    where sessions.id = p_session_id
      and sessions.status = 'ACTIVE'
  ) then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;

  insert into swipes (session_id, participant_id, item_id, direction)
  values (p_session_id, p_participant_id, p_item_id, p_direction)
  on conflict (session_id, participant_id, item_id) do nothing;
end;
$$;

grant execute on function record_swipe(uuid, uuid, uuid, swipe_direction) to anon, authenticated;

-- Cleanup: drop the temporary role-diagnostic function from the debugging
-- session that led here.
drop function if exists debug_whoami();
