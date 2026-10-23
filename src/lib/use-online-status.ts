"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// navigator.onLine only reflects the device's network adapter (wifi/cellular
// radio state), not whether the internet actually works — but it's exactly
// what the browser's online/offline events are keyed to, and catching "the
// radio went away" is the case PRD section 58 asks for ("preserve the
// current state... show You're offline. Reconnecting..."), not a full
// connectivity probe.
function getSnapshot() {
  return navigator.onLine;
}

// true during SSR/before hydration — assuming online by default means a
// server-rendered page never flashes the banner before JS has even run.
function getServerSnapshot() {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
