import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { generateSessionCode } from "@/lib/session-code";
import { generateCandidatePool } from "@/services/candidates";
import type { MovieFilter } from "@/services/movies/filters";
import type { RestaurantFilter } from "@/services/restaurants/filters";

export type SessionCategory = "WATCH" | "EAT";
type SessionMode = "COUPLE" | "GROUP";
export type SessionStatus = "WAITING" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";

// Guest ids (sessions.creator_guest_id, participants.guest_id) are bearer
// credentials — they authorize swiping and starting/ending a session — so
// they are never selected into anything that can reach a browser.
const SESSION_COLUMNS =
  "id, code, mode, category, duration_seconds, started_at, expires_at, status, created_at, location_lat, location_lng, location_label, movie_filter, restaurant_filter";
const PARTICIPANT_COLUMNS = "id, session_id, display_name, joined_at";

export interface SessionRow {
  id: string;
  code: string;
  mode: SessionMode;
  category: SessionCategory;
  duration_seconds: number | null;
  started_at: string | null;
  expires_at: string | null;
  status: SessionStatus;
  created_at: string;
  // EAT only: either coordinates or a free-text area (migration 0006).
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  // null = no filter.
  movie_filter: MovieFilter | null;
  restaurant_filter: RestaurantFilter | null;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  display_name: string;
  joined_at: string;
}

// PRD section 6/22: Couple is exactly 2, Group is 3-10.
const MAX_PARTICIPANTS = 10;
const MIN_PARTICIPANTS_TO_START = 2;
const MAX_CODE_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505";

interface CreateSessionInput {
  category: SessionCategory;
  // null = no time limit.
  durationSeconds: number | null;
  creatorGuestId: string;
  displayName: string;
  locationLat: number | null;
  locationLng: number | null;
  locationLabel: string | null;
  movieFilter: MovieFilter | null;
  restaurantFilter: RestaurantFilter | null;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<{ session: SessionRow; participant: ParticipantRow }> {
  const db = getServiceSupabase();

  // Codes are short, so a collision with the unique index is possible —
  // retry with a fresh one rather than trusting a single draw.
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await db
      .from("sessions")
      .insert({
        code: generateSessionCode(),
        category: input.category,
        // The real mode is set from the headcount at start.
        mode: "GROUP",
        duration_seconds: input.durationSeconds,
        status: "WAITING",
        creator_guest_id: input.creatorGuestId,
        location_lat: input.locationLat,
        location_lng: input.locationLng,
        location_label: input.locationLabel,
        movie_filter: input.movieFilter,
        restaurant_filter: input.restaurantFilter,
      })
      .select(SESSION_COLUMNS)
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) continue;
      throw error;
    }

    // The creator is always the session's first participant — getHostParticipantId
    // and the join screen's "Neeraj wants to decide…" both rely on that.
    const { data: participant, error: participantError } = await db
      .from("participants")
      .insert({ session_id: data.id, guest_id: input.creatorGuestId, display_name: input.displayName })
      .select(PARTICIPANT_COLUMNS)
      .single();

    if (participantError) throw participantError;
    return { session: data as SessionRow, participant: participant as ParticipantRow };
  }

  throw new Error("Could not generate a unique session code, please retry.");
}

export async function getSessionById(id: string): Promise<SessionRow | null> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as SessionRow | null;
}

export async function getSessionWithCreatorByCode(
  code: string,
): Promise<{ session: SessionRow; creatorName: string | null } | null> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select(`${SESSION_COLUMNS}, participants(display_name)`)
    .eq("code", code.toUpperCase())
    .order("joined_at", { referencedTable: "participants", ascending: true })
    .limit(1, { referencedTable: "participants" })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { participants, ...session } = data as unknown as SessionRow & {
    participants: { display_name: string }[];
  };
  return { session, creatorName: participants[0]?.display_name ?? null };
}

export async function getParticipants(sessionId: string): Promise<ParticipantRow[]> {
  const { data, error } = await getSupabase()
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ParticipantRow[];
}

// The creator is the earliest participant (see createSession).
export function getHostParticipantId(participants: ParticipantRow[]): string | null {
  return participants[0]?.id ?? null;
}

// True only if `participantId` is this guest's own row in this session. Every
// action that acts on behalf of a participant checks this first, since
// participant ids themselves are visible to everyone in the session.
export async function isOwnParticipant(
  sessionId: string,
  participantId: string,
  guestId: string,
): Promise<boolean> {
  const { data, error } = await getServiceSupabase()
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function joinSession(
  sessionId: string,
  guestId: string,
  displayName: string,
): Promise<ParticipantRow> {
  const db = getServiceSupabase();

  const [existingResult, sessionResult, countResult] = await Promise.all([
    // A rejoin (refresh, reopened link) resolves to the existing row.
    db
      .from("participants")
      .select(PARTICIPANT_COLUMNS)
      .eq("session_id", sessionId)
      .eq("guest_id", guestId)
      .maybeSingle(),
    db.from("sessions").select("status").eq("id", sessionId).maybeSingle(),
    db.from("participants").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
  ]);

  if (existingResult.error) throw existingResult.error;
  if (existingResult.data) return existingResult.data as ParticipantRow;

  if (sessionResult.error) throw sessionResult.error;
  if (!sessionResult.data) throw new Error("SESSION_NOT_FOUND");
  // PRD section 20: no joining once a session is under way.
  if (sessionResult.data.status !== "WAITING") throw new Error("SESSION_NOT_JOINABLE");

  if (countResult.error) throw countResult.error;
  if ((countResult.count ?? 0) >= MAX_PARTICIPANTS) throw new Error("SESSION_FULL");

  const { data, error } = await db
    .from("participants")
    .insert({ session_id: sessionId, guest_id: guestId, display_name: displayName })
    .select(PARTICIPANT_COLUMNS)
    .single();

  if (error) {
    // A double-submitted join loses the race to its own twin on the
    // (session_id, guest_id) unique index — return the row that won.
    if (error.code === UNIQUE_VIOLATION) {
      const { data: existing, error: refetchError } = await db
        .from("participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("session_id", sessionId)
        .eq("guest_id", guestId)
        .single();
      if (refetchError) throw refetchError;
      return existing as ParticipantRow;
    }
    throw error;
  }
  return data as ParticipantRow;
}

export async function startSession(sessionId: string, guestId: string): Promise<SessionRow> {
  const db = getServiceSupabase();

  const [sessionResult, countResult] = await Promise.all([
    db
      .from("sessions")
      .select(`${SESSION_COLUMNS}, creator_guest_id`)
      .eq("id", sessionId)
      .maybeSingle(),
    db.from("participants").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
  ]);

  if (sessionResult.error) throw sessionResult.error;
  if (!sessionResult.data) throw new Error("SESSION_NOT_FOUND");
  const { creator_guest_id, ...session } = sessionResult.data as unknown as SessionRow & {
    creator_guest_id: string | null;
  };
  if (creator_guest_id !== guestId) throw new Error("NOT_CREATOR");
  if (session.status !== "WAITING") throw new Error("SESSION_ALREADY_STARTED");

  if (countResult.error) throw countResult.error;
  const participantCount = countResult.count ?? 0;
  if (participantCount < MIN_PARTICIPANTS_TO_START) throw new Error("NOT_ENOUGH_PARTICIPANTS");

  // The pool must exist before status flips to ACTIVE: clients load it the
  // moment they see ACTIVE, and the timer shouldn't run before swiping can.
  const poolSize = await generateCandidatePool(session, 1);
  if (poolSize === 0) throw new Error("NO_CANDIDATES");

  const startedAt = new Date();
  const expiresAt = session.duration_seconds
    ? new Date(startedAt.getTime() + session.duration_seconds * 1000).toISOString()
    : null;

  const { data, error } = await db
    .from("sessions")
    .update({
      status: "ACTIVE",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt,
      mode: participantCount === 2 ? "COUPLE" : "GROUP",
    })
    .eq("id", sessionId)
    // Guards a double-tapped Start: only one call flips the status.
    .eq("status", "WAITING")
    .select(SESSION_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("SESSION_ALREADY_STARTED");
  return data as SessionRow;
}

// PRD section 29: "I'm Done" before exhausting the pool.
export async function markParticipantFinished(participantId: string): Promise<void> {
  const { error } = await getServiceSupabase()
    .from("participants")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", participantId);

  if (error) throw error;
}
