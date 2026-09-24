"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "syncup-install-prompt-seen";

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

// PRD's "frictionless, no nagging" principle applied to installs: shown
// once, at the first genuinely meaningful moment (finishing a first
// SyncUp — this only ever mounts on ResultsView, deliberately not on
// first landing), dismissible, and never shown again afterward regardless
// of outcome. No cooldown/re-prompt loop — if someone wants to install
// later, the browser's own install affordance (Android/desktop's
// address-bar icon) is still sitting there; this is just the one nudge
// toward it, and the one substitute for that native affordance on iOS,
// which has none at all.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Starts hidden and only reveals itself once the mount effect below
  // confirms it's actually eligible — avoids a flash of the banner before
  // the localStorage/standalone checks (both synchronous, but still after
  // first paint) have run. One combined object, not several separate
  // fields, so the eligibility check below is a single setState call
  // rather than several cascading ones.
  const [status, setStatus] = useState<{
    eligible: boolean;
    ios: "safari" | "other" | null;
  }>({ eligible: false, ios: null });

  useEffect(() => {
    if (isStandalone()) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    // Deliberate exception to "don't setState in an effect": both checks
    // read browser-only APIs (matchMedia, navigator.userAgent,
    // localStorage) that don't exist during SSR, so this can't be a
    // useState initializer without crashing server-side — same pattern
    // ThemeToggle uses for the same reason.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus({ eligible: true, ios: iosBrowserKind() });

    function handleBeforeInstallPrompt(e: Event) {
      // Stops Chrome's own mini-infobar from appearing behind this —
      // without it, our banner and the browser's would both show up.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setStatus({ eligible: false, ios: null });
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    // Dismiss either way once they've answered the real system dialog —
    // this banner's job (surfacing the option once) is done regardless of
    // which way they went.
    await deferredPrompt.userChoice;
    dismiss();
  }

  // Nothing to offer: not iOS (which always gets the instructional
  // version once eligible) and Chrome hasn't handed over a real prompt
  // yet — showing an "Install" button with nothing behind it would be
  // worse than not showing the banner at all.
  if (!status.eligible || (!status.ios && !deferredPrompt)) return null;

  return (
    <div className="flex w-full items-center gap-3 rounded-card border border-border bg-surface-raised px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Add SyncUp to your home screen</p>
        <p className="text-xs text-foreground-muted">
          {status.ios === "safari"
            ? 'Tap the Share icon, then "Add to Home Screen."'
            : status.ios === "other"
              ? "Open this link in Safari to add it — that's the one browser on iPhone/iPad that can."
              : "One tap next time — no browser tab needed."}
        </p>
      </div>
      {!status.ios && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex-shrink-0 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill text-foreground-muted transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface active:scale-[0.97]"
      >
        ✕
      </button>
    </div>
  );
}
