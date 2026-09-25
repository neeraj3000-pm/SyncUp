-- Every write now goes through the server layer (Server Actions using the
-- service role key, or the security-definer RPCs from migrations 0003-0007),
-- so the anon key no longer needs any direct write access. The policies
-- dropped here let anyone holding the public anon key PATCH any session or
-- participant row directly over the REST API (e.g. flip every session to
-- COMPLETED in one request, or rename other people), skipping every check
-- the app itself performs.
--
-- Run this AFTER the code that switched writes to the service role is live
-- in production — older code still writes with the anon key.

drop policy if exists "anyone can create a session" on sessions;
drop policy if exists "anyone can update session state" on sessions;
drop policy if exists "anyone can join a session" on participants;
drop policy if exists "participants can update their own activity" on participants;
-- Swipes are recorded exclusively through record_swipe() (migration 0004).
drop policy if exists "swipes are insertable while a session is active" on swipes;

-- Each of these duplicates the leading column of a unique constraint's own
-- index, so they only cost extra work on every insert.
drop index if exists sessions_code_idx;
drop index if exists session_items_session_idx;
drop index if exists swipes_session_idx;
drop index if exists matches_session_idx;
