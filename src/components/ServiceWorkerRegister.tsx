"use client";

import { useEffect } from "react";

// One of the three ingredients Chrome/Android need before they'll offer to
// install this app at all (manifest + icons + this) — see public/sw.js for
// what it actually does once registered.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
