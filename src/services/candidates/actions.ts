"use server";

import { getSessionItems, type SessionItemRow } from "@/services/candidates";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// The candidate pool is generated inside startSession (services/sessions),
// after the session page's own server-side fetch already ran — so both the
// creator (who just clicked Start) and anyone else (who gets the ACTIVE
// status via realtime) need to pull it fresh once the session goes live.
export async function getSessionItemsAction(sessionId: string): Promise<ActionResult<SessionItemRow[]>> {
  try {
    const items = await getSessionItems(sessionId);
    return { ok: true, data: items };
  } catch (error) {
    console.error("getSessionItemsAction failed:", error);
    return { ok: false, error: "Couldn't load the candidate pool." };
  }
}
