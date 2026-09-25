"use client";

import { useEffect, useEffectEvent } from "react";

// Runs `callback` right away and then every `intervalMs` while `enabled`.
// Pauses while the tab is hidden — a backgrounded phone gains nothing from
// polling a screen nobody is looking at — and runs again the moment it's
// visible, which is also when a stale screen most needs refreshing.
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const tick = useEffectEvent(callback);

  useEffect(() => {
    if (!enabled) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval !== null) return;
      tick();
      interval = setInterval(tick, intervalMs);
    }
    function stop() {
      if (interval === null) return;
      clearInterval(interval);
      interval = null;
    }
    function handleVisibilityChange() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
