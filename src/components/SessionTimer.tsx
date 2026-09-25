"use client";

import { useEffect, useState } from "react";

// Server-authoritative (PRD section 31): always derived from the session's
// `expiresAt`, so a late joiner or a refresh lands on the correct time.
// `clockOffsetMs` corrects for this device's own clock being wrong.
function secondsLeft(expiresAt: string, clockOffsetMs: number): number {
  const remainingMs = new Date(expiresAt).getTime() - (Date.now() + clockOffsetMs);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function SessionTimer({
  expiresAt,
  clockOffsetMs,
}: {
  expiresAt: string;
  clockOffsetMs: number;
}) {
  const [totalSeconds, setTotalSeconds] = useState(() => secondsLeft(expiresAt, clockOffsetMs));

  useEffect(() => {
    // Ticks often enough to stay accurate, but state only holds whole
    // seconds, so React skips the re-render until the display changes.
    const tick = () => setTotalSeconds(secondsLeft(expiresAt, clockOffsetMs));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [expiresAt, clockOffsetMs]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* role="timer" rather than aria-live: a live region here would make
          screen readers announce every single second. */}
      <span role="timer" className="font-mono text-4xl font-bold tabular-nums">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
      <span className="text-sm text-foreground-muted">
        {totalSeconds === 0 ? "Time's up!" : "remaining"}
      </span>
    </div>
  );
}
