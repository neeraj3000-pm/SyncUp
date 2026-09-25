import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getMoviePool } from "@/services/movies";
import { getRestaurantPool } from "@/services/restaurants";
import { getSessionById, type SessionCategory, type SessionRow } from "@/services/sessions";

// The category-agnostic middle layer CLAUDE.md's architecture rule asks for:
// session/matching code calls this, never a provider directly, and this is
// the only place that switches on `category` to pick a provider.
async function getCandidatesFromProvider(session: SessionRow, batchNumber: number) {
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

// Writes candidates into `items` (upsert, shared across all sessions that
// happen to pool the same movie) and `session_items` (this session's actual
// pool, in swipe order). Both tables have no anon insert policy (migration
// 0001) — service role bypasses that intentionally, since candidate content
// is trusted server-written data, not user input.
export async function generateCandidatePool(
  sessionId: string,
  batchNumber: number,
): Promise<number> {
  const session = await getSessionById(sessionId);
  if (!session) throw new Error("SESSION_NOT_FOUND");

  const candidates = await getCandidatesFromProvider(session, batchNumber);
  if (candidates.length === 0) return 0;

  const service = createServiceClient();

  const { data: upsertedItems, error: upsertError } = await service
    .from("items")
    .upsert(
      candidates.map((c) => ({ category: session.category, ...c })),
      { onConflict: "category,source,external_id", ignoreDuplicates: false },
    )
    .select("id, external_id");

  if (upsertError) throw upsertError;

  const { data: existing, error: existingError } = await service
    .from("session_items")
    .select("item_id, position")
    .eq("session_id", sessionId);

  if (existingError) throw existingError;

  const alreadyInSession = new Set((existing ?? []).map((row) => row.item_id));
  let nextPosition = (existing ?? []).reduce((max, row) => Math.max(max, row.position), -1) + 1;

  const newRows = (upsertedItems ?? [])
    .filter((item) => !alreadyInSession.has(item.id))
    .map((item) => ({
      session_id: sessionId,
      item_id: item.id,
      position: nextPosition++,
      batch_number: batchNumber,
    }));

  if (newRows.length === 0) return 0;

  const { error: insertError } = await service.from("session_items").insert(newRows);
  if (insertError) throw insertError;

  return newRows.length;
}

// items/session_items are publicly readable (migration 0001), so this uses
// the ordinary anon-key client — no need for the service role just to read.
export async function getSessionItems(sessionId: string): Promise<SessionItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_items")
    .select("position, batch_number, item:items(*)")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as SessionItemRow[];
}

export async function getMaxBatchNumber(sessionId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_items")
    .select("batch_number")
    .eq("session_id", sessionId)
    .order("batch_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.batch_number ?? 0;
}
