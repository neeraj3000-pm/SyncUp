"use server";

import {
  createSession,
  getParticipants,
  joinSession,
  startSession,
  type ParticipantRow,
  type SessionCategory,
  type SessionRow,
} from "@/services/sessions";

// Server Functions are reachable by direct POST request, not just from our
// own UI (see Next.js docs on Server Actions), so every input is validated
// here rather than trusted from the client — the same rule the create-page
// form action already followed pre-Sprint 2.
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const FRIENDLY_ERRORS: Record<string, string> = {
  SESSION_NOT_FOUND: "We couldn't find that SyncUp. Check the code and try again.",
  SESSION_NOT_JOINABLE: "This SyncUp has already started.",
  SESSION_FULL: "This SyncUp is full (10/10 people).",
  NOT_ENOUGH_PARTICIPANTS: "You need at least 2 people to start.",
  NOT_CREATOR: "Only the person who started this SyncUp can start it.",
  SESSION_ALREADY_STARTED: "This SyncUp has already started.",
};

function toActionError(error: unknown): string {
  if (error instanceof Error && FRIENDLY_ERRORS[error.message]) {
    return FRIENDLY_ERRORS[error.message];
  }
  // Anything not in FRIENDLY_ERRORS is a bug, not an expected condition
  // (like NOT_CREATOR) — log it so it doesn't get silently swallowed.
  console.error("Unexpected session action error:", error);
  return "Something went wrong. Please try again.";
}

const VALID_CATEGORIES: SessionCategory[] = ["WATCH", "EAT"];
// 2 / 5 / 10 minutes (PRD section 15) plus an MVP addition: 0 from the
// client means "No time limit" and is translated to null before it ever
// reaches the database — see createSession's durationSeconds param.
const VALID_DURATIONS = [0, 120, 300, 600];
const MAX_NAME_LENGTH = 40;

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

const MAX_LOCATION_LABEL_LENGTH = 100;

export async function createSessionAction(input: {
  category: string;
  durationSeconds: number;
  creatorGuestId: string;
  displayName: string;
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
}): Promise<ActionResult<{ session: SessionRow; participant: ParticipantRow }>> {
  const displayName = normalizeName(input.displayName);
  const category = input.category as SessionCategory;
  if (
    !VALID_CATEGORIES.includes(category) ||
    !VALID_DURATIONS.includes(input.durationSeconds) ||
    typeof input.creatorGuestId !== "string" ||
    input.creatorGuestId.length === 0 ||
    !displayName
  ) {
    return { ok: false, error: "Invalid session configuration." };
  }

  // Location is EAT-only (PRD section 13) and one of two shapes: real
  // coordinates from "Use my location," or free text from "Choose an
  // area" — never both, and never either for WATCH.
  const hasCoords =
    typeof input.locationLat === "number" &&
    Number.isFinite(input.locationLat) &&
    typeof input.locationLng === "number" &&
    Number.isFinite(input.locationLng);
  const locationLabel =
    typeof input.locationLabel === "string"
      ? input.locationLabel.trim().slice(0, MAX_LOCATION_LABEL_LENGTH)
      : "";

  if (category === "EAT" && !hasCoords && locationLabel.length === 0) {
    return { ok: false, error: "Tell us where you want to eat." };
  }

  try {
    const data = await createSession({
      category,
      durationSeconds: input.durationSeconds === 0 ? null : input.durationSeconds,
      creatorGuestId: input.creatorGuestId,
      displayName,
      locationLat: category === "EAT" && hasCoords ? input.locationLat : null,
      locationLng: category === "EAT" && hasCoords ? input.locationLng : null,
      locationLabel:
        category === "EAT" && !hasCoords && locationLabel.length > 0 ? locationLabel : null,
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Backstop for the waiting room's Realtime subscription (SessionRoom):
// Supabase's WebSocket occasionally drops or delays an event, which was
// leaving a joiner invisible to the rest of the group until someone
// happened to reload — polling this every few seconds means a missed
// Realtime event self-heals within one poll interval instead of needing a
// manual refresh, same reconciliation pattern SwipeDeck already uses for
// progress.
export async function getParticipantsAction(
  sessionId: string,
): Promise<ActionResult<ParticipantRow[]>> {
  if (typeof sessionId !== "string") {
    return { ok: false, error: "Invalid request." };
  }
  try {
    const data = await getParticipants(sessionId);
    return { ok: true, data };
  } catch (error) {
    console.error("getParticipantsAction failed:", error);
    return { ok: false, error: "Couldn't refresh participants." };
  }
}

export async function joinSessionAction(input: {
  sessionId: string;
  guestId: string;
  displayName: string;
}): Promise<ActionResult<ParticipantRow>> {
  const displayName = normalizeName(input.displayName);
  if (
    typeof input.sessionId !== "string" ||
    typeof input.guestId !== "string" ||
    input.guestId.length === 0 ||
    !displayName
  ) {
    return { ok: false, error: "Enter your name to join." };
  }

  try {
    const data = await joinSession(input.sessionId, input.guestId, displayName);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function startSessionAction(input: {
  sessionId: string;
  guestId: string;
}): Promise<ActionResult<SessionRow>> {
  if (typeof input.sessionId !== "string" || typeof input.guestId !== "string") {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  try {
    const data = await startSession(input.sessionId, input.guestId);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
