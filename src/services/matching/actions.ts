"use server";

import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/validation";
import { completeSessionByCreator, completeSessionByTimer } from "@/services/matching";

// `completed` is the server's answer to "is this session actually over?" —
// callers navigate to results only when it's true.
export async function completeSessionByTimerAction(
  sessionId: string,
): Promise<ActionResult<{ completed: boolean }>> {
  if (!isUuid(sessionId)) return { ok: false, error: "Invalid request." };
  try {
    return { ok: true, data: { completed: await completeSessionByTimer(sessionId) } };
  } catch (error) {
    console.error("completeSessionByTimerAction failed:", error);
    return { ok: false, error: "Couldn't complete the session." };
  }
}

export async function completeSessionByCreatorAction(input: {
  sessionId: string;
  creatorGuestId: string;
}): Promise<ActionResult<{ completed: boolean }>> {
  if (!isUuid(input.sessionId) || typeof input.creatorGuestId !== "string") {
    return { ok: false, error: "Invalid request." };
  }
  try {
    const completed = await completeSessionByCreator(input.sessionId, input.creatorGuestId);
    return { ok: true, data: { completed } };
  } catch (error) {
    console.error("completeSessionByCreatorAction failed:", error);
    return { ok: false, error: "Couldn't end the session. Please try again." };
  }
}
