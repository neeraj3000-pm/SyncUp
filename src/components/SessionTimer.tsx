"use client";

import { useEffect, useState } from "react";

// Server-authoritative (PRD section 31): `expiresAt` comes from the
// session row, not a duration the client started counting down itself. A
// participant who joins late or refreshes mid-session still lands on the
// correct remaining time because it's always derived from that timestamp,
// never from a local countdown that started at full duration on mount.
export function SessionTimer({ expiresAt }: { expiresAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    new Date(expiresAt).getTime() - Date.now(),
  );

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [expiresAt]);

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
