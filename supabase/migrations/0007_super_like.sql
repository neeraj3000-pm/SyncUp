-- Super Like: a stronger-than-plain-SYNC signal, triggered by a dedicated
-- third button (not a gesture — see the design discussion this migration
-- accompanies) alongside Pass/Sync. Deliberately NOT a third swipe
-- direction: it's still a SYNC, just flagged, so every place that already
-- filters "direction = 'SYNC'" for Sync Score keeps working unchanged —
-- Super Like only affects ranking/tie-breaking and the reveal screen's
-- "you both loved this" callout, never the score itself.

alter table swipes add column if not exists super_liked boolean not null default false;

-- A Pass can't be a super-like — nothing to "love" about something you
-- rejected. Prevents a malformed record_swipe call from ever producing one.
alter table swipes add constraint swipes_super_liked_requires_sync
  check (not super_liked or direction = 'SYNC');

alter table matches add column if not exists super_like_count integer not null default 0;

-- record_swipe (migration 0004) gets a 5th param rather than a new
-- function, since it's still recording one swipe — DROP+CREATE because
-- Postgres identifies functions by their full argument list, so adding a
-- param isn't a like-for-like REPLACE.
drop function if exists record_swipe(uuid, uuid, uuid, swipe_direction);

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

  insert into swipes (session_id, participant_id, item_id, direction, super_liked)
  values (p_session_id, p_participant_id, p_item_id, p_direction, p_super_liked)
  on conflict (session_id, participant_id, item_id) do nothing;
end;
$$;

grant execute on function record_swipe(uuid, uuid, uuid, swipe_direction, boolean) to anon, authenticated;

-- Ranking (PRD section 34: must never reorder between refreshes) now breaks
-- ties on super_like_count before falling back to content rating. This is
-- one unified rule for both Couple and Group, not mode-specific logic:
-- in Couple, every 100%-score match is already tied on score, so a mutual
-- super-like (super_like_count = participant_count = 2) naturally floats
-- to the top of that tie; in Group, it only breaks ties among
-- already-equal scores, never outranks a genuinely higher Sync Score.
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

  insert into matches (
    session_id, item_id, sync_score, participant_count, liked_count, super_like_count, rank
  )
  select
    p_session_id,
    scored.item_id,
    scored.liked_count::numeric / v_participant_count * 100,
    v_participant_count,
    scored.liked_count,
    scored.super_like_count,
    row_number() over (
      order by
        scored.liked_count::numeric / v_participant_count desc,
        scored.super_like_count desc,
        scored.rating desc,
        scored.item_id asc
    )
  from (
    select
      s.item_id,
      count(*) filter (where s.direction = 'SYNC') as liked_count,
      count(*) filter (where s.super_liked) as super_like_count,
      coalesce((i.metadata->>'rating')::numeric, 0) as rating
    from swipes s
    join items i on i.id = s.item_id
    where s.session_id = p_session_id
    group by s.item_id, i.metadata
    having count(*) filter (where s.direction = 'SYNC') > 0
  ) scored;
end;
$$;
