"use client";

import { useEffect, useState } from "react";

// Matches the inline blocking script in layout.tsx — keep both in sync if
// this ever changes.
const STORAGE_KEY = "syncup-theme";

// PRD design system: warm off-white light theme, deep midnight dark theme
// (CLAUDE.md). Tokens for both already exist and follow the system
// preference automatically (globals.css); this is the missing manual
// override, since nothing let someone pick a theme independent of their
// device's own setting.
export function ThemeToggle() {
  // undefined until mounted: avoids a hydration mismatch, since the
  // server has no localStorage and the blocking script in layout.tsx has
  // already decided the real value on <html> before this ever renders.
  const [theme, setTheme] = useState<"light" | "dark" | undefined>(undefined);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    // Deliberate exception to the "don't setState in an effect" rule: this
    // reads a browser-only API (the DOM attribute the blocking script set,
    // or matchMedia) that doesn't exist during SSR, so it genuinely can't
    // be a useState initializer — that would crash server-side, since
    // Next.js still renders "use client" components' function bodies on
    // the server for the initial HTML. Running once after mount, to
    // correct the SSR-safe `undefined` default above, is the standard
    // pattern for this (e.g. how next-themes itself works).
    if (current === "dark" || current === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(current);
    } else {
      setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (theme === undefined) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-pill border border-border bg-surface text-foreground shadow-md transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

// Plain emoji here rendered inconsistently across platforms and read as a
// placeholder, not a deliberate icon — a thin-stroke outline pair (currentColor,
// so it always matches the surrounding text/theme) is the minimal, considered
// alternative.
function SunIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.22 4.22l1.77 1.77M18 18l1.78 1.78M2.5 12H5M19 12h2.5M4.22 19.78l1.77-1.77M18 6l1.78-1.78"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
