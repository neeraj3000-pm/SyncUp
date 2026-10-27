import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
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

// Scoring itself happens inside the completion RPCs (migration 0005/0007);
// this only reads the stored, already-ranked result.
export async function getMatches(sessionId: string): Promise<MatchRow[]> {
  const { data, error } = await getSupabase()
    .from("matches")
    .select("sync_score, participant_count, liked_count, super_like_count, rank, item:items(*)")
    .eq("session_id", sessionId)
    .order("rank", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MatchRow[];
}

// Both completion RPCs are silent no-ops when their conditions aren't met
// (deadline not reached by the database clock, caller isn't the creator,
// already finished), so success is read back from the row itself — the
// server stays the authority on the timer even when a device clock is fast.
async function completeAndConfirm(
  rpc: "complete_session_on_timer" | "complete_session_by_creator",
  args: Record<string, string>,
  sessionId: string,
): Promise<boolean> {
  const { error } = await getServiceSupabase().rpc(rpc, args);
  if (error) throw error;

  const session = await getSessionById(sessionId);
  return session?.status === "COMPLETED";
}

// PRD section 31: the timer running out ends the session for everyone.
export function completeSessionByTimer(sessionId: string): Promise<boolean> {
  return completeAndConfirm("complete_session_on_timer", { p_session_id: sessionId }, sessionId);
}

// PRD section 30: early reveal / "End Now" — creator-only.
export function completeSessionByCreator(
  sessionId: string,
  creatorGuestId: string,
): Promise<boolean> {
  return completeAndConfirm(
    "complete_session_by_creator",
    { p_session_id: sessionId, p_creator_guest_id: creatorGuestId },
    sessionId,
  );
}
