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
      className="fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-pill border border-border bg-surface text-lg shadow-md transition-colors hover:bg-surface-raised"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
