import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The service role key bypasses Row Level Security entirely (CLAUDE.md
// "Security" section) — this client exists only for the handful of writes
// RLS deliberately has no policy for (items, session_items: see migration
// 0001), and must never be imported by anything that runs in the browser.
// `server-only` turns any accidental client-side import into a build error.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
