import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One shared browser client — only used for Realtime subscriptions.
let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  browserClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return browserClient;
}
