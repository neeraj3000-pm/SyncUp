import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getMoviePool } from "@/services/movies";
import { getRestaurantPool } from "@/services/restaurants";
import type { SessionCategory, SessionRow } from "@/services/sessions";

// The category-agnostic middle layer (CLAUDE.md's architecture rule):
// session/matching code calls this, never a provider directly, and this is
// the only place that switches on `category` to pick one.
function getCandidatesFromProvider(session: SessionRow, batchNumber: number) {
  switch (session.category) {
    case "WATCH":
      return getMoviePool(batchNumber, session.movie_filter);
    case "EAT":
      return getRestaurantPool(
        session.location_lat !== null && session.location_lng !== null
          ? { lat: session.location_lat, lng: session.location_lng }
          : { label: session.location_label ?? "" },
        batchNumber,
        session.restaurant_filter,
      );
  }
}

export interface ItemRow {
  id: string;
  category: SessionCategory;
  external_id: string;
  source: string;
  title: string;
  description: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
}

export interface SessionItemRow {
  item: ItemRow;
  position: number;
  batch_number: number;
}

// Writes candidates into `items` (shared across sessions that pool the same
// movie/restaurant) and `session_items` (this session's pool, in swipe
// order). Returns how many new items the session gained.
export async function generateCandidatePool(
  session: SessionRow,
  batchNumber: number,
): Promise<number> {
  const db = getServiceSupabase();

  const [candidates, existingResult] = await Promise.all([
    getCandidatesFromProvider(session, batchNumber),
    db.from("session_items").select("item_id, position").eq("session_id", session.id),
  ]);
  if (existingResult.error) throw existingResult.error;
  if (candidates.length === 0) return 0;

  const { data: upsertedItems, error: upsertError } = await db
    .from("items")
    .upsert(
      candidates.map((c) => ({ category: session.category, ...c })),
      { onConflict: "category,source,external_id" },
    )
    .select("id");
  if (upsertError) throw upsertError;

  const existing = existingResult.data ?? [];
  const alreadyInSession = new Set(existing.map((row) => row.item_id));
  let nextPosition = existing.reduce((max, row) => Math.max(max, row.position), -1) + 1;

  const newRows = (upsertedItems ?? [])
    .filter((item) => !alreadyInSession.has(item.id))
    .map((item) => ({
      session_id: session.id,
      item_id: item.id,
      position: nextPosition++,
      batch_number: batchNumber,
    }));
  if (newRows.length === 0) return 0;

  // Two participants reaching the end of the deck together can both request
  // the same batch — ignoring duplicates lets the slower one succeed
  // quietly instead of failing on the unique (session_id, item_id) index.
  const { data: inserted, error: insertError } = await db
    .from("session_items")
    .upsert(newRows, { onConflict: "session_id,item_id", ignoreDuplicates: true })
    .select("item_id");
  if (insertError) throw insertError;

  return inserted?.length ?? 0;
}

export async function getSessionItems(sessionId: string): Promise<SessionItemRow[]> {
  const { data, error } = await getSupabase()
    .from("session_items")
    .select("position, batch_number, item:items(*)")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as SessionItemRow[];
}

export async function getMaxBatchNumber(sessionId: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from("session_items")
    .select("batch_number")
    .eq("session_id", sessionId)
    .order("batch_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.batch_number ?? 0;
}
