"use client";

import { useEffect, useState } from "react";

// Server-authoritative (PRD section 31): `expiresAt` comes from the
// session row, not a duration the client started counting down itself. A
// participant who joins late or refreshes mid-session still lands on the
// correct remaining time because it's always derived from that timestamp,
// never from a local countdown that started at full duration on mount.
//
// clockOffsetMs corrects for this device's own clock being wrong (fast
// system clock, misconfigured timezone) — without it, this countdown would
// compare a server timestamp against a client Date.now() that might be
// minutes off, showing "Time's up!" while the server (and everyone else's
// correctly-clocked device) still has time left. SessionRoom computes it
// once from the timestamp its own server component captured on render.
export function SessionTimer({
  expiresAt,
  clockOffsetMs,
}: {
  expiresAt: string;
  clockOffsetMs: number;
}) {
  const [remainingMs, setRemainingMs] = useState(
    () => new Date(expiresAt).getTime() - (Date.now() + clockOffsetMs),
  );

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(expiresAt).getTime() - (Date.now() + clockOffsetMs));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [expiresAt, clockOffsetMs]);

  const done = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-mono text-4xl font-bold tabular-nums"
        aria-live="polite"
      >
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
      <span className="text-sm text-foreground-muted">
        {done ? "Time's up!" : "remaining"}
      </span>
    </div>
  );
}
