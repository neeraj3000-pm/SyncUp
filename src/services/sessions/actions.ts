"use server";

import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/validation";
import {
  createSession,
  getParticipants,
  getSessionById,
  joinSession,
  startSession,
  type ParticipantRow,
  type SessionCategory,
  type SessionRow,
} from "@/services/sessions";
import { isValidMovieFilter, type MovieFilter } from "@/services/movies/filters";
import {
  RESTAURANT_CUISINES,
  RESTAURANT_DISTANCES_KM,
  RESTAURANT_PRICES,
  isEmptyRestaurantFilter,
  type RestaurantFilter,
} from "@/services/restaurants/filters";

// Server Actions are reachable by direct POST request, not just from our
// own UI, so every input is validated here rather than trusted.

const FRIENDLY_ERRORS: Record<string, string> = {
  SESSION_NOT_FOUND: "We couldn't find that SyncUp. Check the code and try again.",
  SESSION_NOT_JOINABLE: "This SyncUp has already started.",
  SESSION_FULL: "This SyncUp is full (10/10 people).",
  NOT_ENOUGH_PARTICIPANTS: "You need at least 2 people to start.",
  NOT_CREATOR: "Only the person who started this SyncUp can start it.",
  SESSION_ALREADY_STARTED: "This SyncUp has already started.",
  NO_CANDIDATES:
    "We couldn't find anything to swipe on. Try again, or start a new SyncUp with fewer filters.",
};

function toActionError(error: unknown): string {
  if (error instanceof Error && FRIENDLY_ERRORS[error.message]) {
    return FRIENDLY_ERRORS[error.message];
  }
  // Anything not in FRIENDLY_ERRORS is a bug, not an expected condition.
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

// Rebuilt from the validated fields, so no extra client-sent keys get stored.
function normalizeMovieFilter(raw: unknown): MovieFilter | null | "invalid" {
  if (raw === null || raw === undefined) return null;
  if (!isValidMovieFilter(raw)) return "invalid";
  return { kind: raw.kind, value: raw.value } as MovieFilter;
}

// Each field is optional and validated on its own, since these are
// independent axes rather than one tagged choice like MovieFilter.
function isAllowed(value: unknown, allowed: readonly unknown[]): boolean {
  return value === null || value === undefined || allowed.includes(value);
}

const CUISINE_VALUES = RESTAURANT_CUISINES.map((o) => o.value);
const PRICE_VALUES = RESTAURANT_PRICES.map((o) => o.value);

function normalizeRestaurantFilter(raw: unknown): RestaurantFilter | null | "invalid" {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return "invalid";
  const { cuisine, price, openNow, distanceKm } = raw as Record<string, unknown>;

  if (
    !isAllowed(cuisine, CUISINE_VALUES) ||
    !isAllowed(price, PRICE_VALUES) ||
    !isAllowed(distanceKm, RESTAURANT_DISTANCES_KM) ||
    (openNow !== undefined && typeof openNow !== "boolean")
  ) {
    return "invalid";
  }

  const filter: RestaurantFilter = {
    cuisine: (cuisine as RestaurantFilter["cuisine"]) ?? null,
    price: (price as RestaurantFilter["price"]) ?? null,
    openNow: openNow === true,
    distanceKm: (distanceKm as number | undefined) ?? null,
  };
  // "No filter" is stored one way (null), never as an all-defaults object.
  return isEmptyRestaurantFilter(filter) ? null : filter;
}

function isLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 90;
}

function isLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 180;
}

export async function createSessionAction(input: {
  category: string;
  durationSeconds: number;
  creatorGuestId: string;
  displayName: string;
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
  movieFilter?: unknown;
  restaurantFilter?: unknown;
}): Promise<ActionResult<{ session: SessionRow; participant: ParticipantRow }>> {
  const displayName = normalizeName(input.displayName);
  const category = input.category as SessionCategory;
  const movieFilter = normalizeMovieFilter(input.movieFilter);
  const restaurantFilter = normalizeRestaurantFilter(input.restaurantFilter);
  if (
    !VALID_CATEGORIES.includes(category) ||
    !VALID_DURATIONS.includes(input.durationSeconds) ||
    !isUuid(input.creatorGuestId) ||
    !displayName ||
    movieFilter === "invalid" ||
    restaurantFilter === "invalid"
  ) {
    return { ok: false, error: "Invalid session configuration." };
  }

  // Location is EAT-only (PRD section 13) and one of two shapes: real
  // coordinates ("Use my location" or a picked suggestion), or free text
  // ("Choose an area") — never both, and never either for WATCH.
  const coords =
    category === "EAT" && isLatitude(input.locationLat) && isLongitude(input.locationLng)
      ? { lat: input.locationLat, lng: input.locationLng }
      : null;
  const locationLabel =
    category === "EAT" && !coords && typeof input.locationLabel === "string"
      ? input.locationLabel.trim().slice(0, MAX_LOCATION_LABEL_LENGTH) || null
      : null;

  if (category === "EAT" && !coords && !locationLabel) {
    return { ok: false, error: "Tell us where you want to eat." };
  }

  try {
    const data = await createSession({
      category,
      durationSeconds: input.durationSeconds === 0 ? null : input.durationSeconds,
      creatorGuestId: input.creatorGuestId,
      displayName,
      locationLat: coords?.lat ?? null,
      locationLng: coords?.lng ?? null,
      locationLabel,
      movieFilter: category === "WATCH" ? movieFilter : null,
      restaurantFilter: category === "EAT" ? restaurantFilter : null,
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Backstops for SessionRoom's Realtime subscription: a dropped or delayed
// WebSocket event would otherwise leave a joiner invisible, or a screen
// stuck on the waiting room after the session started, until a reload.
export async function getParticipantsAction(
  sessionId: string,
): Promise<ActionResult<ParticipantRow[]>> {
  if (!isUuid(sessionId)) return { ok: false, error: "Invalid request." };
  try {
    return { ok: true, data: await getParticipants(sessionId) };
  } catch (error) {
    console.error("getParticipantsAction failed:", error);
    return { ok: false, error: "Couldn't refresh participants." };
  }
}

export async function getSessionAction(sessionId: string): Promise<ActionResult<SessionRow | null>> {
  if (!isUuid(sessionId)) return { ok: false, error: "Invalid request." };
  try {
    return { ok: true, data: await getSessionById(sessionId) };
  } catch (error) {
    console.error("getSessionAction failed:", error);
    return { ok: false, error: "Couldn't refresh session status." };
  }
}

export async function joinSessionAction(input: {
  sessionId: string;
  guestId: string;
  displayName: string;
}): Promise<ActionResult<ParticipantRow>> {
  const displayName = normalizeName(input.displayName);
  if (!isUuid(input.sessionId) || !isUuid(input.guestId) || !displayName) {
    return { ok: false, error: "Enter your name to join." };
  }

  try {
    return { ok: true, data: await joinSession(input.sessionId, input.guestId, displayName) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function startSessionAction(input: {
  sessionId: string;
  guestId: string;
}): Promise<ActionResult<SessionRow>> {
  if (!isUuid(input.sessionId) || !isUuid(input.guestId)) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  try {
    return { ok: true, data: await startSession(input.sessionId, input.guestId) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
