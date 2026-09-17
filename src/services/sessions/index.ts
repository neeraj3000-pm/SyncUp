import { createClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session-code";

export type SessionCategory = "WATCH" | "EAT";
export type SessionMode = "COUPLE" | "GROUP";

interface CreateSessionInput {
  category: SessionCategory;
  durationSeconds: number;
}

// Codes are short and drawn from a ~29-character alphabet, so collisions are
// rare but not impossible — retry a handful of times against the unique
// constraint on sessions.code rather than trusting one random draw.
const MAX_CODE_ATTEMPTS = 5;

export async function createSession({
  category,
  durationSeconds,
}: CreateSessionInput) {
  const supabase = await createClient();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateSessionCode();

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        code,
        category,
        // Couple vs. Group isn't a creator choice in the PRD flow (section 10) —
        // it's derived from how many participants actually join. Sprint 2's
        // "start session" step recomputes this from the real participant count
        // before the timer begins; the matching math (liked/total * 100) is
        // identical either way, so this default has no effect until then.
        mode: "GROUP",
        duration_seconds: durationSeconds,
        status: "WAITING",
      })
      .select()
      .single();

    if (!error) return data;
    // 23505 = unique_violation. Anything else is a real failure, surface it.
    if (error.code !== "23505") throw error;
  }

  throw new Error("Could not generate a unique session code, please retry.");
}

export async function getSessionById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSessionByCode(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function joinSession(sessionId: string, displayName: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .insert({ session_id: sessionId, display_name: displayName })
    .select()
    .single();

  if (error) throw error;
  return data;
}
