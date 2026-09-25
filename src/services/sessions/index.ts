import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { generateSessionCode } from "@/lib/session-code";
import { generateCandidatePool } from "@/services/candidates";
import type { MovieFilter } from "@/services/movies/filters";
import type { RestaurantFilter } from "@/services/restaurants/filters";

export type SessionCategory = "WATCH" | "EAT";
export type SessionMode = "COUPLE" | "GROUP";
export type SessionStatus =
  | "WAITING"
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export interface SessionRow {
  id: string;
  code: string;
  creator_id: string | null;
  creator_guest_id: string | null;
  mode: SessionMode;
  category: SessionCategory;
  title: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  expires_at: string | null;
  status: SessionStatus;
  decision_rule: string;
  created_at: string;
  // EAT only (PRD section 13) — exactly one location shape is set; see
  // migration 0006 for which restaurant search each one implies.
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  // null means no filter ("All Movies" / "All Restaurants").
  movie_filter: MovieFilter | null;
  restaurant_filter: RestaurantFilter | null;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  user_id: string | null;
  guest_id: string | null;
  display_name: string;
  joined_at: string;
  last_active_at: string;
}

// PRD section 6/22: Couple is exactly 2, Group is 3-10.
const MAX_PARTICIPANTS = 10;
const MIN_PARTICIPANTS_TO_START = 2;

// Codes come from a ~29-character alphabet, so collisions are rare but
// possible — retry against the unique constraint instead of trusting one draw.
const MAX_CODE_ATTEMPTS = 5;

const UNIQUE_VIOLATION = "23505";

interface CreateSessionInput {
  category: SessionCategory;
  // null = no time limit.
  durationSeconds: number | null;
  creatorGuestId: string;
  displayName: string;
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
  movieFilter?: MovieFilter | null;
  restaurantFilter?: RestaurantFilter | null;
}

export async function createSession({
  category,
  durationSeconds,
  creatorGuestId,
  displayName,
  locationLat = null,
  locationLng = null,
  locationLabel = null,
  movieFilter = null,
  restaurantFilter = null,
}: CreateSessionInput): Promise<{
  session: SessionRow;
  participant: ParticipantRow;
}> {
  const db = getServiceSupabase();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await db
      .from("sessions")
      .insert({
        code: generateSessionCode(),
        category,
        // Couple vs. Group is derived from the real headcount at start
        // (startSession); the matching math is identical either way.
        mode: "GROUP",
        duration_seconds: durationSeconds,
        status: "WAITING",
        creator_guest_id: creatorGuestId,
        location_lat: locationLat,
        location_lng: locationLng,
        location_label: locationLabel,
        movie_filter: movieFilter,
        restaurant_filter: restaurantFilter,
      })
      .select()
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) continue;
      throw error;
    }

    const session = data as SessionRow;
    // The creator is the first participant. Inserted directly rather than
    // through joinSession(): this session is guaranteed fresh, so its
    // rejoin/status/capacity checks would only add round trips.
    const { data: participant, error: participantError } = await db
      .from("participants")
      .insert({ session_id: session.id, guest_id: creatorGuestId, display_name: displayName })
      .select()
      .single();

    if (participantError) throw participantError;
    return { session, participant: participant as ParticipantRow };
  }

  throw new Error("Could not generate a unique session code, please retry.");
}

export async function getSessionById(id: string): Promise<SessionRow | null> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as SessionRow | null;
}

// The join screen needs the session plus its creator's name (PRD section
// 19: "Neeraj wants to decide what to watch") — fetched in one query. The
// creator is always the earliest participant, since createSession inserts
// them alongside the session itself.
export async function getSessionWithCreatorByCode(
  code: string,
): Promise<{ session: SessionRow; creatorName: string | null } | null> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .select("*, participants(display_name)")
    .eq("code", code.toUpperCase())
    .order("joined_at", { referencedTable: "participants", ascending: true })
    .limit(1, { referencedTable: "participants" })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { participants, ...session } = data as SessionRow & {
    participants: { display_name: string }[];
  };
  return { session, creatorName: participants[0]?.display_name ?? null };
}

export async function getParticipants(sessionId: string): Promise<ParticipantRow[]> {
  const { data, error } = await getSupabase()
    .from("participants")
    .select()
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ParticipantRow[];
}

export async function joinSession(
  sessionId: string,
  guestId: string,
  displayName: string,
): Promise<ParticipantRow> {
  const supabase = getSupabase();

  // Independent checks, run together: one round trip instead of three.
  const [existingResult, sessionResult, countResult] = await Promise.all([
    // Rejoining (refresh, or opening the same link twice) resolves back to
    // the existing row rather than creating a duplicate participant.
    supabase
      .from("participants")
      .select()
      .eq("session_id", sessionId)
      .eq("guest_id", guestId)
      .maybeSingle(),
    supabase.from("sessions").select("status").eq("id", sessionId).maybeSingle(),
    supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
  ]);

  if (existingResult.error) throw existingResult.error;
  if (existingResult.data) return existingResult.data as ParticipantRow;

  if (sessionResult.error) throw sessionResult.error;
  if (!sessionResult.data) throw new Error("SESSION_NOT_FOUND");
  // PRD section 20: joining once the session is ACTIVE is disabled for MVP.
  if (sessionResult.data.status !== "WAITING") throw new Error("SESSION_NOT_JOINABLE");

  if (countResult.error) throw countResult.error;
  if ((countResult.count ?? 0) >= MAX_PARTICIPANTS) throw new Error("SESSION_FULL");

  const { data, error } = await getServiceSupabase()
    .from("participants")
    .insert({ session_id: sessionId, guest_id: guestId, display_name: displayName })
    .select()
    .single();

  if (error) {
    // A double-submitted join from the same browser loses the race to its
    // own twin on the (session_id, guest_id) unique index — that row is
    // exactly the one this call was trying to create, so return it.
    if (error.code === UNIQUE_VIOLATION) {
      const { data: existing, error: refetchError } = await supabase
        .from("participants")
        .select()
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
  const supabase = getSupabase();

  const [sessionResult, countResult] = await Promise.all([
    supabase.from("sessions").select().eq("id", sessionId).maybeSingle(),
    supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId),
  ]);

  if (sessionResult.error) throw sessionResult.error;
  const session = sessionResult.data as SessionRow | null;
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.creator_guest_id !== guestId) throw new Error("NOT_CREATOR");
  if (session.status !== "WAITING") throw new Error("SESSION_ALREADY_STARTED");

  if (countResult.error) throw countResult.error;
  const participantCount = countResult.count ?? 0;
  if (participantCount < MIN_PARTICIPANTS_TO_START) {
    throw new Error("NOT_ENOUGH_PARTICIPANTS");
  }

  // The pool must exist BEFORE status flips to ACTIVE: realtime subscribers
  // load it the moment they see ACTIVE, and the timer should only start
  // once swiping can actually begin.
  const poolSize = await generateCandidatePool(session, 1);
  // Narrow restaurant filters can leave nothing to swipe on — better to say
  // so now than to start a session with an empty deck.
  if (poolSize === 0) throw new Error("NO_CANDIDATES");

  const startedAt = new Date();
  // null duration = no time limit, so no expiry either.
  const expiresAt = session.duration_seconds
    ? new Date(startedAt.getTime() + session.duration_seconds * 1000).toISOString()
    : null;

  const { data, error } = await getServiceSupabase()
    .from("sessions")
    .update({
      status: "ACTIVE",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt,
      // PRD section 21/22: exactly 2 participants is Couple, 3-10 is Group.
      mode: participantCount === 2 ? "COUPLE" : "GROUP",
    })
    .eq("id", sessionId)
    // Guards a double-tapped Start: only one call gets to flip the status.
    .eq("status", "WAITING")
    .select()
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
