"use server";

import {
  createSession,
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

export async function createSessionAction(input: {
  category: string;
  durationSeconds: number;
  creatorGuestId: string;
  displayName: string;
}): Promise<ActionResult<{ session: SessionRow; participant: ParticipantRow }>> {
  const displayName = normalizeName(input.displayName);
  if (
    !VALID_CATEGORIES.includes(input.category as SessionCategory) ||
    !VALID_DURATIONS.includes(input.durationSeconds) ||
    typeof input.creatorGuestId !== "string" ||
    input.creatorGuestId.length === 0 ||
    !displayName
  ) {
    return { ok: false, error: "Invalid session configuration." };
  }

  try {
    const data = await createSession({
      category: input.category as SessionCategory,
      durationSeconds: input.durationSeconds === 0 ? null : input.durationSeconds,
      creatorGuestId: input.creatorGuestId,
      displayName,
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
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
