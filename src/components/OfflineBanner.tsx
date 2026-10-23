"use client";

import { useOnlineStatus } from "@/lib/use-online-status";

// PRD section 58: "Network interruption — preserve the current state where
// possible and show: You're offline. Reconnecting..." The "preserve state"
// half is already true throughout this app: every polling backstop and
// Server Action already fails silently and just retries on the next tick,
// never navigating away or crashing on a dropped connection. This is the
// other half — the visible signal, so a stalled screen reads as "the
// network dropped" instead of "this app is broken."
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-center text-sm font-semibold text-background"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      {/* prefers-reduced-motion already strips animation-duration globally
          (globals.css), so this pulse quiets itself automatically. */}
      <span aria-hidden className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-background" />
      You&apos;re offline. Reconnecting…
    </div>
  );
}
