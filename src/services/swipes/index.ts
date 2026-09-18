import { createClient } from "@/lib/supabase/server";

export type SwipeDirection = "SYNC" | "PASS";

export async function recordSwipe(
  sessionId: string,
  participantId: string,
  itemId: string,
  direction: SwipeDirection,
): Promise<void> {
  const supabase = await createClient();
  // Upsert rather than insert: a duplicate submission of the same swipe
  // (e.g. a retried request) should be a no-op, not a unique-constraint
  // error surfaced to the UI. The deck only ever lets a card be swiped
  // once, so this never legitimately changes an existing direction.
  const { error } = await supabase
    .from("swipes")
    .upsert(
      { session_id: sessionId, participant_id: participantId, item_id: itemId, direction },
      { onConflict: "session_id,participant_id,item_id" },
    );

  if (error) throw error;
}

// The swipes RLS policy blocks reading ANY row (including your own) while a
// session is ACTIVE, which is correct for hiding other participants' choices
// but also hides your own from yourself on a refresh — see migration 0003.
// This calls the security-definer RPC that carves out just that exception.
export async function getMySwipedItemIds(
  sessionId: string,
  participantId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_swipes", {
    p_session_id: sessionId,
    p_participant_id: participantId,
  });

  if (error) throw error;
  return new Set((data ?? []).map((row: { item_id: string }) => row.item_id));
}

export interface ParticipantProgress {
  participant_id: string;
  display_name: string;
  swipe_count: number;
  finished_at: string | null;
}

// Aggregate-only (never item_id/direction) — see session_progress() in
// migration 0001 for why this is the one sanctioned way to show activity
// ("Neeraj — 23/50") without leaking individual choices.
export async function getSessionProgress(sessionId: string): Promise<ParticipantProgress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("session_progress", { p_session_id: sessionId });

  if (error) throw error;
  return (data ?? []) as ParticipantProgress[];
}

// PRD section 29: choosing "I'm Done" before exhausting the pool. Once set,
// the participant is treated as finished regardless of swipe_count.
export async function markParticipantFinished(participantId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("participants")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", participantId);

  if (error) throw error;
}
