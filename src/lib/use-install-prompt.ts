"use client";

import { useSyncExternalStore } from "react";

// iOS has no beforeinstallprompt and no feature-detectable "can add to home
// screen", so this is the one place the UA is checked. Only Safari's own
// Share sheet has "Add to Home Screen"; Chrome/Firefox/Edge/Opera on iOS
// carry their own UA tokens and need to be sent to Safari instead.
function iosBrowserKind(): "safari" | "other" | null {
  const ua = navigator.userAgent;
  if (!/iPad|iPhone|iPod/.test(ua)) return null;
  return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "other" : "safari";
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS's home-screen flag; the media query doesn't cover it there.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPlatform = "ios-safari" | "ios-other" | "promptable" | "other";

// beforeinstallprompt fires once per page load, usually before the component
// that wants it has mounted — so it's captured as soon as this module loads
// (the root layout imports it) and shared through a tiny store.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setDeferredPrompt(prompt: BeforeInstallPromptEvent | null) {
  deferredPrompt = prompt;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stops Chrome's own mini-infobar from showing alongside our UI.
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setDeferredPrompt(null));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPlatform(): InstallPlatform {
  if (deferredPrompt) return "promptable";
  const ios = iosBrowserKind();
  return ios === "safari" ? "ios-safari" : ios === "other" ? "ios-other" : "other";
}

export function useInstallPrompt() {
  // null / false during SSR and hydration.
  const platform = useSyncExternalStore(subscribe, getPlatform, () => null);
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => false);

  async function promptInstall() {
    const prompt = deferredPrompt;
    if (!prompt) return;
    // A prompt can only be shown once.
    setDeferredPrompt(null);
    await prompt.prompt();
    await prompt.userChoice;
  }

  return { platform, standalone, promptInstall };
}
