"use client";

import { useEffect, useState } from "react";

// The one accepted exception to "media queries over capability, not user-
// agent sniffing" (mobile-native skill): there's no feature-detectable way
// to ask "can this browser manually add to home screen" — iOS Safari never
// fires beforeinstallprompt and has no programmatic install path at all,
// so telling it apart from a browser that might still fire that event
// genuinely requires checking the UA. Even web.dev's own PWA-install guide
// does this for the same reason.
//
// Matching just "is this an iPhone/iPad" isn't enough, though — Apple
// requires every iOS browser to run on its engine, but each still ships
// its own thin UI on top, and only Safari's own Share sheet has a real,
// manifest-aware "Add to Home Screen." Chrome/Firefox/Edge/Opera on iOS
// each carry their own UA token specifically so this can be told apart;
// without ruling them out, Chrome-on-iPad got sent through the same
// "tap Share, then Add to Home Screen" instructions as real Safari, for
// a Share sheet that doesn't have that option.
function iosBrowserKind(): "safari" | "other" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (!/iPad|iPhone|iPod/.test(ua)) return null;
  return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? "other" : "safari";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS's own non-standard flag for "launched from the home screen" —
    // matchMedia above doesn't cover it there.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "ios-safari" | "ios-other" | "promptable" | "other";

// Shared by InstallPrompt (the dismissible post-session nudge) and the
// About page's always-visible install card — both need the same platform
// read and the same beforeinstallprompt capture, just presented
// differently, so the fiddly UA/event-listener logic lives here once.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    // Deliberate exception to "don't setState in an effect": both checks
    // read browser-only APIs (matchMedia, navigator.userAgent) that don't
    // exist during SSR, so this can't be a useState initializer without
    // crashing server-side — same pattern ThemeToggle uses for the same
    // reason.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandalone(isStandalone());
    const ios = iosBrowserKind();
    setPlatform(ios === "safari" ? "ios-safari" : ios === "other" ? "ios-other" : "other");

    function handleBeforeInstallPrompt(e: Event) {
      // Stops Chrome's own mini-infobar from appearing behind this —
      // without it, our own UI and the browser's would both show up.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("promptable");
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return { platform, standalone, promptInstall };
}
