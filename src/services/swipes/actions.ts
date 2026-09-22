"use server";

import {
  getMySwipedItemIds,
  getSessionProgress,
  markParticipantFinished,
  recordSwipe,
  type ParticipantProgress,
  type SwipeDirection,
} from "@/services/swipes";
import {
  generateCandidatePool,
  getMaxBatchNumber,
  getSessionItems,
  type SessionItemRow,
} from "@/services/candidates";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const VALID_DIRECTIONS: SwipeDirection[] = ["SYNC", "PASS"];

export async function swipeAction(input: {
  sessionId: string;
  participantId: string;
  itemId: string;
  direction: string;
}): Promise<ActionResult<null>> {
  if (
    typeof input.sessionId !== "string" ||
    typeof input.participantId !== "string" ||
    typeof input.itemId !== "string" ||
    !VALID_DIRECTIONS.includes(input.direction as SwipeDirection)
  ) {
    return { ok: false, error: "Invalid swipe." };
  }

  try {
    await recordSwipe(
      input.sessionId,
      input.participantId,
      input.itemId,
      input.direction as SwipeDirection,
    );
    return { ok: true, data: null };
  } catch (error) {
    console.error("swipeAction failed:", error);
    return { ok: false, error: "Couldn't save that swipe. Please try again." };
  }
}

// PRD section 12: "Show Me 50 More" once a participant reaches the end of
// the current batch. Returns the session's full, updated item list so the
// client can just replace its deck rather than reconcile a partial diff.
export async function requestMoreCandidatesAction(input: {
  sessionId: string;
}): Promise<ActionResult<SessionItemRow[]>> {
  if (typeof input.sessionId !== "string") {
    return { ok: false, error: "Invalid request." };
  }

  try {
    const nextBatch = (await getMaxBatchNumber(input.sessionId)) + 1;
    await generateCandidatePool(input.sessionId, nextBatch);
    const items = await getSessionItems(input.sessionId);
    return { ok: true, data: items };
  } catch (error) {
    console.error("requestMoreCandidatesAction failed:", error);
    return { ok: false, error: "Couldn't load more — please try again." };
  }
}

export async function getMySwipedItemIdsAction(input: {
  sessionId: string;
  participantId: string;
}): Promise<ActionResult<string[]>> {
  try {
    const ids = await getMySwipedItemIds(input.sessionId, input.participantId);
    return { ok: true, data: Array.from(ids) };
  } catch (error) {
    console.error("getMySwipedItemIdsAction failed:", error);
    return { ok: false, error: "Couldn't load your progress." };
  }
}

export async function getSessionProgressAction(
  sessionId: string,
): Promise<ActionResult<ParticipantProgress[]>> {
  try {
    const progress = await getSessionProgress(sessionId);
    return { ok: true, data: progress };
  } catch (error) {
    console.error("getSessionProgressAction failed:", error);
    return { ok: false, error: "Couldn't load progress." };
  }
}

export async function markFinishedAction(
  participantId: string,
): Promise<ActionResult<null>> {
  try {
    await markParticipantFinished(participantId);
    return { ok: true, data: null };
  } catch (error) {
    console.error("markFinishedAction failed:", error);
    return { ok: false, error: "Couldn't save that. Please try again." };
  }
}
