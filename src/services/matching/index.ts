import { createClient } from "@/lib/supabase/server";
import { getSessionById } from "@/services/sessions";
import type { ItemRow } from "@/services/candidates";

export interface MatchRow {
  item: ItemRow;
  sync_score: number;
  participant_count: number;
  liked_count: number;
  super_like_count: number;
  rank: number;
}

// matches is publicly readable (migration 0001) — this is a plain anon read,
// the actual scoring happens inside complete_session_on_timer /
// complete_session_by_creator (migration 0005) when the session finishes.
export async function getMatches(sessionId: string): Promise<MatchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("sync_score, participant_count, liked_count, super_like_count, rank, item:items(*)")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MatchRow[];
}

// PRD section 31: "When the timer expires, the session automatically
// enters the reveal state" — any connected client can call this once its
// own clock *thinks* time's up; the RPC itself re-checks expires_at
// against the database's own clock and is idempotent, so a speculative
// call from a device whose clock is fast (or in the wrong timezone) is a
// harmless no-op there.
//
// The part that used to be missing: whether that speculative call
// actually completed anything. A caller that just assumes success and
// navigates to /results regardless is trusting the client's own clock
// after all, just one level removed — exactly what CLAUDE.md's
// server-authoritative-timer rule exists to prevent. So this re-fetches
// the session afterward and hands back its real status, and the caller
// (SessionRoom) only navigates once that confirms COMPLETED.
export async function completeSessionByTimer(sessionId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_session_on_timer", {
    p_session_id: sessionId,
  });

  if (error) throw error;

  const session = await getSessionById(sessionId);
  return session?.status === "COMPLETED";
}

// PRD section 30's early-reveal prompt, plus the manual "End Now" override
// for untimed sessions — both are creator-only (see migration 0005's
// comment on why: a remote group needs exactly one clear decision-maker,
// not several participants' taps racing each other).
export async function completeSessionByCreator(
  sessionId: string,
  creatorGuestId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_session_by_creator", {
    p_session_id: sessionId,
    p_creator_guest_id: creatorGuestId,
  });

  if (error) throw error;
}
