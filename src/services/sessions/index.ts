import { createClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session-code";
// Type-only — erased at compile time, so this never pulls services/movies'
// "server-only" runtime module into a client bundle (DetailSheet.tsx
// already relies on the same thing for MovieDetail).
import type { MovieFilter } from "@/services/movies";

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
  // EAT only (PRD section 13) — exactly one of these shapes is set. See
  // migration 0006 for which restaurant-search mode each implies.
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  // WATCH only (PRD section 11-12) — null means "All Movies," no filter.
  movie_filter: MovieFilter | null;
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

// The MVP's participant cap (PRD section 6/22: Group mode is 3-10 people;
// combined with Couple's 2, 10 is the hard ceiling either way).
const MAX_PARTICIPANTS = 10;
const MIN_PARTICIPANTS_TO_START = 2;

// Codes are short and drawn from a ~29-character alphabet, so collisions are
// rare but not impossible — retry a handful of times against the unique
// constraint on sessions.code rather than trusting one random draw.
const MAX_CODE_ATTEMPTS = 5;

interface CreateSessionInput {
  category: SessionCategory;
  // null = no time limit (PRD section 15's 2/5/10 min plus an MVP addition
  // — a group can choose to just take as long as they want).
  durationSeconds: number | null;
  creatorGuestId: string;
  displayName: string;
  // EAT only — see SessionRow's location fields.
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
  // WATCH only — see SessionRow's movie_filter field.
  movieFilter?: MovieFilter | null;
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
}: CreateSessionInput): Promise<{
  session: SessionRow;
  participant: ParticipantRow;
}> {
  const supabase = await createClient();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateSessionCode();

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        code,
        category,
        // Couple vs. Group isn't a creator choice in the PRD flow (section 10) —
        // it's derived from how many participants actually join. startSession
        // recomputes this from the real participant count before the timer
        // begins; the matching math (liked/total * 100) is identical either
        // way, so this default has no effect until then.
        mode: "GROUP",
        duration_seconds: durationSeconds,
        status: "WAITING",
        creator_guest_id: creatorGuestId,
        location_lat: locationLat,
        location_lng: locationLng,
        location_label: locationLabel,
        movie_filter: movieFilter,
      })
      .select()
      .single();

    if (!error) {
      const session = data as SessionRow;
      // The creator is the session's first participant — this is what lets
      // the waiting room (and the join screen's "X wants to decide...")
      // show a name for the creator without a separate account system.
      //
      // Inserted directly rather than going through the full joinSession()
      // below: that function's rejoin-check, WAITING-status check, and
      // participant-count check all exist to guard against real joiners
      // hitting a session in some unknown state, but the session we just
      // created a few lines up is guaranteed fresh (brand-new id, status
      // WAITING, zero participants) — those three extra round trips were
      // pure overhead for this specific case, and were a real chunk of why
      // "Create SyncUp" felt slow to respond.
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .insert({ session_id: session.id, guest_id: creatorGuestId, display_name: displayName })
        .select()
        .single();

      if (participantError) throw participantError;
      return { session, participant: participantData as ParticipantRow };
    }
    // 23505 = unique_violation. Anything else is a real failure, surface it.
    if (error.code !== "23505") throw error;
  }

  throw new Error("Could not generate a unique session code, please retry.");
}

export async function getSessionById(id: string): Promise<SessionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as SessionRow | null;
}

export async function getSessionByCode(
  code: string,
): Promise<SessionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data as SessionRow | null;
}

export async function getParticipants(
  sessionId: string,
): Promise<ParticipantRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select()
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ParticipantRow[];
}

// The creator is always the first participant to join a session (created
// atomically alongside it in createSession), so "earliest joined_at" is the
// creator's display name — used for the join screen's category context
// (PRD section 19: "Neeraj wants to decide what to watch").
export async function getCreatorName(
  sessionId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("display_name")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.display_name ?? null;
}

export async function joinSession(
  sessionId: string,
  guestId: string,
  displayName: string,
): Promise<ParticipantRow> {
  const supabase = await createClient();

  // These three checks don't depend on each other's results, so running
  // them one-after-another (as this originally did) was three sequential
  // network round trips before a joiner could even see the waiting room —
  // a real chunk of why joining felt slow. Firing them together cuts that
  // to one round trip's worth of latency.
  const [existingResult, sessionResult, countResult] = await Promise.all([
    // Rejoining (refresh, or opening the same link twice) should resolve
    // back to the existing row rather than erroring on the unique
    // constraint or creating a duplicate participant.
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
  // PRD section 20: joining after the session has gone ACTIVE is disabled
  // for MVP rather than supported mid-session.
  if (sessionResult.data.status !== "WAITING") throw new Error("SESSION_NOT_JOINABLE");

  if (countResult.error) throw countResult.error;
  if ((countResult.count ?? 0) >= MAX_PARTICIPANTS) throw new Error("SESSION_FULL");

  const { data, error } = await supabase
    .from("participants")
    .insert({ session_id: sessionId, guest_id: guestId, display_name: displayName })
    .select()
    .single();

  if (error) throw error;
  return data as ParticipantRow;
}

export async function startSession(
  sessionId: string,
  guestId: string,
): Promise<SessionRow> {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select()
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.creator_guest_id !== guestId) throw new Error("NOT_CREATOR");
  if (session.status !== "WAITING") throw new Error("SESSION_ALREADY_STARTED");

  const { count, error: countError } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countError) throw countError;
  const participantCount = count ?? 0;
  if (participantCount < MIN_PARTICIPANTS_TO_START) {
    throw new Error("NOT_ENOUGH_PARTICIPANTS");
  }

  // PRD section 21/22: exactly 2 participants is Couple mode, 3-10 is Group.
  const mode: SessionMode = participantCount === 2 ? "COUPLE" : "GROUP";

  // The candidate pool (PRD section 12) must exist BEFORE the status flips
  // to ACTIVE, not after — flipping status first was letting a realtime
  // subscriber (a joiner's device) see "ACTIVE" and try to load the pool
  // before generateCandidatePool had actually written any session_items,
  // with nothing to prompt a retry once it finished. Generating first also
  // means the timer (below) starts counting down from when swiping can
  // actually begin, not from before the TMDB calls even finished.
  const { generateCandidatePool } = await import("@/services/candidates");
  await generateCandidatePool(sessionId, 1);

  const startedAt = new Date();
  // null duration_seconds ("No time limit") means no expiry — SessionTimer
  // already treats a null expires_at as "don't render a countdown," and
  // completion then only ever happens via the creator's manual End/Reveal.
  const expiresAt = session.duration_seconds
    ? new Date(startedAt.getTime() + session.duration_seconds * 1000)
    : null;

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "ACTIVE",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      mode,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as SessionRow;
}
