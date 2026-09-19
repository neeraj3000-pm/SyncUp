"use server";

import { completeSessionByCreator, completeSessionByTimer } from "@/services/matching";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function completeSessionByTimerAction(
  sessionId: string,
): Promise<ActionResult<null>> {
  try {
    await completeSessionByTimer(sessionId);
    return { ok: true, data: null };
  } catch (error) {
    console.error("completeSessionByTimerAction failed:", error);
    return { ok: false, error: "Couldn't complete the session." };
  }
}

export async function completeSessionByCreatorAction(input: {
  sessionId: string;
  creatorGuestId: string;
}): Promise<ActionResult<null>> {
  try {
    await completeSessionByCreator(input.sessionId, input.creatorGuestId);
    return { ok: true, data: null };
  } catch (error) {
    console.error("completeSessionByCreatorAction failed:", error);
    return { ok: false, error: "Couldn't end the session. Please try again." };
  }
}
