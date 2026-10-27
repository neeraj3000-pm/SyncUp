"use client";

import { useEffect } from "react";
// Imported here, in the root layout, so it starts listening for the browser's
// one-shot install event before any page that offers "Install" has mounted.
import "@/lib/use-install-prompt";

// Chrome/Android only offer to install with a manifest, icons and a
// registered service worker — see public/sw.js for what it does.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
