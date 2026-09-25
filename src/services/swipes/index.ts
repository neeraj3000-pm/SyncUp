import "server-only";
import { getSupabase } from "@/lib/supabase/server";

export type SwipeDirection = "SYNC" | "PASS";

// Goes through the record_swipe() RPC (migration 0004/0007), which checks
// the session is ACTIVE itself. ON CONFLICT DO NOTHING inside it makes a
// retried submission a silent no-op rather than a unique-constraint error.
export async function recordSwipe(
  sessionId: string,
  participantId: string,
  itemId: string,
  direction: SwipeDirection,
  superLiked = false,
): Promise<void> {
  const { error } = await getSupabase().rpc("record_swipe", {
    p_session_id: sessionId,
    p_participant_id: participantId,
    p_item_id: itemId,
    p_direction: direction,
    p_super_liked: superLiked,
  });

  if (error) throw error;
}

// RLS hides every swipe while a session is ACTIVE — including your own, so
// a refresh would re-show already-swiped cards. get_my_swipes() (migration
// 0003) carves out just that one exception.
export async function getMySwipedItemIds(
  sessionId: string,
  participantId: string,
): Promise<string[]> {
  const { data, error } = await getSupabase().rpc("get_my_swipes", {
    p_session_id: sessionId,
    p_participant_id: participantId,
  });

  if (error) throw error;
  return ((data ?? []) as { item_id: string }[]).map((row) => row.item_id);
}

export interface ParticipantProgress {
  participant_id: string;
  display_name: string;
  swipe_count: number;
  finished_at: string | null;
}

// Aggregate-only (never item_id/direction) — the one sanctioned way to show
// "Neeraj — 23/50" without leaking individual choices (migration 0001/0003).
export async function getSessionProgress(sessionId: string): Promise<ParticipantProgress[]> {
  const { data, error } = await getSupabase().rpc("session_progress", {
    p_session_id: sessionId,
  });

  if (error) throw error;
  return (data ?? []) as ParticipantProgress[];
}
