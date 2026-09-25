"use server";

import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/validation";
import {
  getMySwipedItemIds,
  getSessionProgress,
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
import { getSessionById, markParticipantFinished } from "@/services/sessions";

const VALID_DIRECTIONS: SwipeDirection[] = ["SYNC", "PASS"];

// Every "Show Me More" batch is a round of paid provider calls (TMDB,
// Google Places) — a generous ceiling keeps a stuck client or a scripted
// caller from running that up without limit.
const MAX_BATCHES = 10;
const MAX_LOOKAHEAD_BATCHES = 3;

export async function swipeAction(input: {
  sessionId: string;
  participantId: string;
  itemId: string;
  direction: string;
  superLiked?: boolean;
}): Promise<ActionResult<null>> {
  if (
    !isUuid(input.sessionId) ||
    !isUuid(input.participantId) ||
    !isUuid(input.itemId) ||
    !VALID_DIRECTIONS.includes(input.direction as SwipeDirection) ||
    (input.superLiked !== undefined && typeof input.superLiked !== "boolean")
  ) {
    return { ok: false, error: "Invalid swipe." };
  }

  // A Pass can't be a super-like (matches the DB constraint).
  const superLiked = input.superLiked === true && input.direction === "SYNC";

  try {
    await recordSwipe(
      input.sessionId,
      input.participantId,
      input.itemId,
      input.direction as SwipeDirection,
      superLiked,
    );
    return { ok: true, data: null };
  } catch (error) {
    console.error("swipeAction failed:", error);
    return { ok: false, error: "Couldn't save that swipe. Please try again." };
  }
}

// PRD section 12: "Show Me 50 More". Returns the session's full, updated
// item list so the client can replace its deck rather than merge a diff.
export async function requestMoreCandidatesAction(input: {
  sessionId: string;
}): Promise<ActionResult<SessionItemRow[]>> {
  if (!isUuid(input.sessionId)) {
    return { ok: false, error: "Invalid request." };
  }

  try {
    const [session, maxBatch] = await Promise.all([
      getSessionById(input.sessionId),
      getMaxBatchNumber(input.sessionId),
    ]);
    if (session?.status !== "ACTIVE") {
      return { ok: false, error: "This SyncUp isn't active anymore." };
    }
    if (maxBatch >= MAX_BATCHES) {
      return { ok: false, error: "That's everything we've got for this SyncUp." };
    }

    // A batch can come back with nothing new (all duplicates, or everything
    // filtered out). The batch number is derived from what's stored, so
    // without looking a little further ahead, a retry would just request
    // the same empty batch forever.
    let added = 0;
    const lastBatch = Math.min(maxBatch + MAX_LOOKAHEAD_BATCHES, MAX_BATCHES);
    for (let batch = maxBatch + 1; batch <= lastBatch && added === 0; batch++) {
      added = await generateCandidatePool(session, batch);
    }
    if (added === 0) {
      return { ok: false, error: "No new options found — that's everything for now." };
    }
    return { ok: true, data: await getSessionItems(input.sessionId) };
  } catch (error) {
    console.error("requestMoreCandidatesAction failed:", error);
    return { ok: false, error: "Couldn't load more — please try again." };
  }
}

export async function getMySwipedItemIdsAction(input: {
  sessionId: string;
  participantId: string;
}): Promise<ActionResult<string[]>> {
  if (!isUuid(input.sessionId) || !isUuid(input.participantId)) {
    return { ok: false, error: "Invalid request." };
  }
  try {
    return { ok: true, data: await getMySwipedItemIds(input.sessionId, input.participantId) };
  } catch (error) {
    console.error("getMySwipedItemIdsAction failed:", error);
    return { ok: false, error: "Couldn't load your progress." };
  }
}

export async function getSessionProgressAction(
  sessionId: string,
): Promise<ActionResult<ParticipantProgress[]>> {
  if (!isUuid(sessionId)) return { ok: false, error: "Invalid request." };
  try {
    return { ok: true, data: await getSessionProgress(sessionId) };
  } catch (error) {
    console.error("getSessionProgressAction failed:", error);
    return { ok: false, error: "Couldn't load progress." };
  }
}

export async function markFinishedAction(participantId: string): Promise<ActionResult<null>> {
  if (!isUuid(participantId)) return { ok: false, error: "Invalid request." };
  try {
    await markParticipantFinished(participantId);
    return { ok: true, data: null };
  } catch (error) {
    console.error("markFinishedAction failed:", error);
    return { ok: false, error: "Couldn't save that. Please try again." };
  }
}
