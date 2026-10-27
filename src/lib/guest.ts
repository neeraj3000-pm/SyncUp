import { useSyncExternalStore } from "react";

// No accounts in the MVP (PRD section 43). Each browser gets a locally-stored
// id the app uses to recognize the same participant across a session — it is
// not a verified identity, just a client-side convenience.
const GUEST_ID_KEY = "syncup_guest_id";
const PARTICIPANT_ID_PREFIX = "syncup_participant_";

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateGuestId can only run in the browser");
  }

  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(GUEST_ID_KEY, id);
  return id;
}

// Remembers which participant row *this* session belongs to, so reopening a
// join link or refreshing the waiting room skips straight past the name
// form instead of asking again.
function getStoredParticipantId(sessionId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTICIPANT_ID_PREFIX + sessionId);
}

export function setStoredParticipantId(
  sessionId: string,
  participantId: string,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARTICIPANT_ID_PREFIX + sessionId, participantId);
}

// Read after hydration via useSyncExternalStore (null/undefined on the
// server). Nothing to subscribe to: these keys only change in this tab.
const noSubscription = () => () => {};

export function useGuestId(): string | null {
  return useSyncExternalStore(noSubscription, getOrCreateGuestId, () => null);
}

export function useStoredParticipantId(sessionId: string): string | null | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => getStoredParticipantId(sessionId),
    () => undefined,
  );
}
