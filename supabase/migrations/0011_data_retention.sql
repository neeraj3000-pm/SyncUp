-- PRD section 59: "Define a retention policy before production launch."
-- No specific numbers were given, so these are the concrete thresholds
-- chosen for MVP:
--   - WAITING sessions older than 48h: nobody ever started them — a code
--     was generated and never used, nothing worth keeping.
--   - ACTIVE sessions older than 7 days: abandoned mid-swipe, most likely
--     a "No time limit" session nobody came back to finish. 7 days is
--     generous enough that a real multi-day group decision isn't cut off
--     early, while still reclaiming genuinely dead ones.
--   - COMPLETED/EXPIRED/CANCELLED sessions older than 30 days: the result
--     has been seen, and nothing in the UI links back to a session once
--     its invite link is gone (Re-Sync always creates a fresh one).
-- Every child table (participants, session_items, swipes, matches) has
-- `on delete cascade` to sessions (migration 0001), so deleting the
-- session row alone is enough. `items` is deliberately untouched — it's
-- shared content cache keyed by (category, source, external_id), not
-- session-specific data, and orphaned rows there are a feature (a cache
-- hit for the next session that pools the same movie/restaurant), not a
-- leak worth cleaning up.
create or replace function cleanup_old_sessions()
returns table (deleted_waiting bigint, deleted_active bigint, deleted_finished bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_waiting bigint;
  v_active bigint;
  v_finished bigint;
begin
  with deleted as (
    delete from sessions
    where status = 'WAITING' and created_at < now() - interval '48 hours'
    returning 1
  )
  select count(*) into v_waiting from deleted;

  with deleted as (
    delete from sessions
    where status = 'ACTIVE' and started_at < now() - interval '7 days'
    returning 1
  )
  select count(*) into v_active from deleted;

  with deleted as (
    delete from sessions
    where status in ('COMPLETED', 'EXPIRED', 'CANCELLED')
      and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*) into v_finished from deleted;

  return query select v_waiting, v_active, v_finished;
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, which
-- anon/authenticated inherit from — explicitly revoked, since this is a
-- bulk-delete function nothing but the service role (used by the cron
-- route handler) should ever be able to call.
revoke all on function cleanup_old_sessions() from public, anon, authenticated;
