import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";

// PRD section 59's retention policy (migration 0011), run daily by Vercel
// Cron (vercel.json). Vercel signs cron-triggered requests with this
// header when CRON_SECRET is set — checked so the endpoint can't be
// triggered (and data mass-deleted) by anyone who finds the URL.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data, error } = await getServiceSupabase().rpc("cleanup_old_sessions");
  if (error) {
    console.error("cleanup_old_sessions failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...data?.[0] });
}
