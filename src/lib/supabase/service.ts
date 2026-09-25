import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Bypasses Row Level Security. Every write happens through this, after the
// server layer has validated the request — anon has no insert/update
// policies to rely on (migration 0010).
let serviceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  serviceClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}
