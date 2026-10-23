"use client";

import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/lib/use-install-prompt";

const STORAGE_KEY = "syncup-install-prompt-seen";

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
  const { platform, standalone, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (standalone) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
  }, [standalone]);

  function dismiss() {
    setDismissed(true);
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  async function handleInstallClick() {
    await promptInstall();
    // This banner's job (surfacing the option once) is done once they've
    // answered the real system dialog, regardless of which way they went.
    dismiss();
  }

  // Nothing to offer: not iOS (which always gets the instructional
  // version once eligible) and Chrome hasn't handed over a real prompt
  // yet — showing an "Install" button with nothing behind it would be
  // worse than not showing the banner at all.
  if (dismissed || !platform || platform === "other") return null;

  return (
    <div className="flex w-full items-center gap-3 rounded-card border border-border bg-surface-raised px-4 py-3 shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Add SyncUp to your home screen</p>
        <p className="text-xs text-foreground-muted">
          {platform === "ios-safari"
            ? 'Tap the Share icon, then "Add to Home Screen."'
            : platform === "ios-other"
              ? "Open this link in Safari to add it to your home screen."
              : "One tap next time — no browser tab needed."}
        </p>
      </div>
      {platform === "promptable" && (
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
