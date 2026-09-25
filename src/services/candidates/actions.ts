"use server";

import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/validation";
import { getSessionItems, type SessionItemRow } from "@/services/candidates";

// The pool is generated inside startSession, after the session page's own
// server-side fetch — so everyone on the page pulls it fresh once the
// session goes live.
export async function getSessionItemsAction(
  sessionId: string,
): Promise<ActionResult<SessionItemRow[]>> {
  if (!isUuid(sessionId)) return { ok: false, error: "Invalid request." };
  try {
    return { ok: true, data: await getSessionItems(sessionId) };
  } catch (error) {
    console.error("getSessionItemsAction failed:", error);
    return { ok: false, error: "Couldn't load the candidate pool." };
  }
}
