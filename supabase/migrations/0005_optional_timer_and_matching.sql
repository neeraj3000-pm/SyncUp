-- Sprint 4: reveal, Sync Score, and an optional timer.

-- ── optional timer ───────────────────────────────────────────────────────
-- The creator can now choose "No time limit" alongside 2/5/10 min. A null
-- duration_seconds means "no limit"; startSession leaves expires_at null in
-- that case too, which the existing SessionTimer component already treats
-- as "don't render a countdown" (see src/components/SessionRoom.tsx).
alter table sessions alter column duration_seconds drop not null;

-- ── completing a session ────────────────────────────────────────────────
-- Shared core: idempotent (the `where status = 'ACTIVE'` + `if not found`
-- guard means a second caller racing to complete the same session is a
-- harmless no-op), and computes Sync Score for every item that got at
-- least one SYNC swipe. Ranking: highest score first, then the item's own
-- TMDB rating as a tie-break, then item_id as a final deterministic
-- fallback — PRD section 34 is explicit that results must never reorder
-- between refreshes.
--
-- Not granted to anon/authenticated directly: only the two wrapper
-- functions below are, so every completion path goes through one of their
-- authorization checks. (A SECURITY DEFINER function calling another
-- function it owns isn't blocked by the callee's own grants, so this still
-- works from inside the wrappers.)
create or replace function _complete_session_core(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_count integer;
begin
  update sessions set status = 'COMPLETED'
  where id = p_session_id and status = 'ACTIVE';

  if not found then
    return;
  end if;

  select count(*) into v_participant_count from participants where session_id = p_session_id;

  insert into matches (session_id, item_id, sync_score, participant_count, liked_count, rank)
  select
    p_session_id,
    scored.item_id,
    scored.liked_count::numeric / v_participant_count * 100,
    v_participant_count,
    scored.liked_count,
    row_number() over (
      order by
        scored.liked_count::numeric / v_participant_count desc,
        scored.rating desc,
        scored.item_id asc
    )
  from (
    select
      s.item_id,
      count(*) filter (where s.direction = 'SYNC') as liked_count,
      coalesce((i.metadata->>'rating')::numeric, 0) as rating
    from swipes s
    join items i on i.id = s.item_id
    where s.session_id = p_session_id
    group by s.item_id, i.metadata
    having count(*) filter (where s.direction = 'SYNC') > 0
  ) scored;
end;
$$;

-- Timer expiry: anyone's client can trigger this once the deadline has
-- genuinely passed — it's enforcing an already-agreed cutoff, not a
-- discretionary choice, so it deliberately has no creator check.
create or replace function complete_session_on_timer(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from sessions
    where id = p_session_id
      and status = 'ACTIVE'
      and expires_at is not null
      and expires_at <= now()
  ) then
    perform _complete_session_core(p_session_id);
  end if;
end;
$$;

grant execute on function complete_session_on_timer(uuid) to anon, authenticated;

-- Manual reveal/"End Now": creator-only (PRD section 30's early-reveal
-- prompt, plus the manual override for untimed sessions) — matches the
-- same authority level as starting the session in the first place, so a
-- remote group never has two people's taps racing to decide the moment.
create or replace function complete_session_by_creator(p_session_id uuid, p_creator_guest_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from sessions
    where id = p_session_id
      and status = 'ACTIVE'
      and creator_guest_id = p_creator_guest_id
  ) then
    perform _complete_session_core(p_session_id);
  end if;
end;
$$;

grant execute on function complete_session_by_creator(uuid, text) to anon, authenticated;
