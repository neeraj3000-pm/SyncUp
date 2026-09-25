import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Guests never sign in (PRD section 43), so there's no per-request auth
// state to carry in cookies — one stateless anon client can serve every
// request. Reads go through this so Row Level Security still applies.
let anonClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  anonClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return anonClient;
}
