-- Guest ids are the only thing that proves "this browser is that
-- participant" (or the session's creator), but the public anon key could read
-- them straight off sessions/participants, and could call get_my_swipes() for
-- anyone's participant id to see their choices mid-session. After this:
--   * the anon key can read every column except the guest ids — Realtime
--     respects column privileges too, so they also stop appearing in
--     postgres_changes payloads;
--   * the RPCs that trust a participant/creator id are service-role only,
--     reached solely through Server Actions that check ownership first.
--
-- Run this AFTER the code that calls these RPCs with the service role is live
-- in production — older code still calls them with the anon key.

revoke select on sessions from anon, authenticated;
grant select (
  id, code, creator_id, mode, category, title, duration_seconds, started_at,
  expires_at, status, decision_rule, created_at, location_lat, location_lng,
  location_label, movie_filter, restaurant_filter
) on sessions to anon, authenticated;

revoke select on participants from anon, authenticated;
grant select (
  id, session_id, user_id, display_name, joined_at, last_active_at, finished_at
) on participants to anon, authenticated;

-- Also defense in depth: a swipe must come from someone in that session, on an
-- item in that session's pool.
create or replace function record_swipe(
  p_session_id uuid,
  p_participant_id uuid,
  p_item_id uuid,
  p_direction swipe_direction,
  p_super_liked boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_super_liked and p_direction <> 'SYNC' then
    raise exception 'SUPER_LIKE_REQUIRES_SYNC';
  end if;

  if not exists (
    select 1 from sessions
    where sessions.id = p_session_id
      and sessions.status = 'ACTIVE'
  ) then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;

  if not exists (
    select 1 from participants
    where participants.id = p_participant_id
      and participants.session_id = p_session_id
  ) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;

  if not exists (
    select 1 from session_items
    where session_items.session_id = p_session_id
      and session_items.item_id = p_item_id
  ) then
    raise exception 'ITEM_NOT_IN_SESSION';
  end if;

  insert into swipes (session_id, participant_id, item_id, direction, super_liked)
  values (p_session_id, p_participant_id, p_item_id, p_direction, p_super_liked)
  on conflict (session_id, participant_id, item_id) do nothing;
end;
$$;

revoke all on function record_swipe(uuid, uuid, uuid, swipe_direction, boolean)
  from public, anon, authenticated;
revoke all on function get_my_swipes(uuid, uuid) from public, anon, authenticated;
revoke all on function complete_session_by_creator(uuid, text) from public, anon, authenticated;
revoke all on function complete_session_on_timer(uuid) from public, anon, authenticated;

grant execute on function record_swipe(uuid, uuid, uuid, swipe_direction, boolean) to service_role;
grant execute on function get_my_swipes(uuid, uuid) to service_role;
grant execute on function complete_session_by_creator(uuid, text) to service_role;
grant execute on function complete_session_on_timer(uuid) to service_role;
