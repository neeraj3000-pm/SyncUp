"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { MovieFilter } from "@/services/movies";

type Tab = "genre" | "discover" | "language";

const TABS: { value: Tab; label: string }[] = [
  { value: "genre", label: "Genre" },
  { value: "discover", label: "Discover" },
  { value: "language", label: "Language" },
];
const TAB_INDEX: Record<Tab, number> = { genre: 0, discover: 1, language: 2 };

const GENRE_OPTIONS = [
  { value: "action", label: "Action" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "horror", label: "Horror" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "animation", label: "Animation" },
] as const;

// Trimmed from the original 5 down to the 3 most distinct: timely (Now
// Playing), trending (Popular), quality (Top Rated) — Best of the 90s/2000s
// blurred together with the others and weren't worth the extra tap.
const DISCOVER_OPTIONS = [
  { value: "now_playing_india", label: "Now Playing in India" },
  { value: "popular", label: "Popular Right Now" },
  { value: "top_rated", label: "Top Rated" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "hindi", label: "Bollywood" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "malayalam", label: "Malayalam" },
  { value: "marathi", label: "Marathi" },
] as const;

const OPTIONS_BY_TAB: Record<Tab, readonly { value: string; label: string }[]> = {
  genre: GENRE_OPTIONS,
  discover: DISCOVER_OPTIONS,
  language: LANGUAGE_OPTIONS,
};

// 19 options across the three tabs was real decision fatigue for a screen
// whose whole point is removing it — collapsed behind an explicit,
// clearly-optional toggle instead of always visible, so "All Movies"
// (already selected) is the zero-extra-tap default and this is only for
// someone who actually wants to narrow it down.
export function MovieFilterPicker({
  value,
  onChange,
}: {
  value: MovieFilter | null;
  onChange: (filter: MovieFilter | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("genre");
  // Which side new chip content slides in from — set alongside activeTab
  // so a forward tap (Genre→Discover→Language) and a backward one animate
  // in opposite directions instead of always sliding the same way.
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion();

  function selectTab(tab: Tab) {
    setDirection(TAB_INDEX[tab] - TAB_INDEX[activeTab]);
    setActiveTab(tab);
  }

  function selectChip(kind: Tab, chipValue: string) {
    // Tapping the already-selected chip clears back to "All Movies" —
    // a quick way to undo without a separate "clear filter" control.
    if (value?.kind === kind && value.value === chipValue) {
      onChange(null);
      return;
    }
    onChange({ kind, value: chipValue } as MovieFilter);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`inline-flex w-fit items-center gap-2 rounded-pill px-[18px] py-[10px] text-sm font-bold shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
          value === null
            ? "border border-primary bg-primary text-white"
            : "border border-border bg-surface text-foreground"
        }`}
      >
        {value === null && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        All Movies
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center justify-between gap-3 py-1"
      >
        <span
          className={`text-sm font-semibold ${open ? "text-foreground" : "text-foreground-muted"}`}
        >
          Narrow it down <span className="font-medium text-foreground-muted">(optional)</span>
        </span>
        {/* A real ~40px button, not a bare icon — easy to tap without
            aiming, and rotates to signal open/closed state. */}
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-pill border border-border bg-surface shadow-card transition-transform duration-200 ease-out"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.35 }
            }
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">
              {/* The active tab's coral pill is one shared layoutId element
                  — Framer Motion animates it sliding between tab
                  positions instead of it just appearing in the new spot. */}
              <div className="relative flex rounded-pill border border-border bg-surface p-1 shadow-card">
                {TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => selectTab(t.value)}
                    className={`relative z-10 flex-1 rounded-pill py-2 text-sm font-bold transition-colors duration-150 ${
                      activeTab === t.value ? "text-white" : "text-foreground-muted"
                    }`}
                  >
                    {activeTab === t.value && (
                      <motion.span
                        layoutId="movie-filter-tab-pill"
                        className="absolute inset-0 -z-10 rounded-pill bg-primary"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", bounce: 0.15, duration: 0.35 }
                        }
                      />
                    )}
                    {t.label}
                  </button>
                ))}
              </div>

              {/* mode="wait" rather than overlapping the outgoing/incoming
                  chip rows: each tab wraps to a different number of rows
                  (Discover is 1, Genre is 2), and overlapping two
                  different-height absolutely-positioned rows would jump
                  the panel's height mid-transition. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction >= 0 ? 20 : -20 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.28 }}
                  className="flex flex-wrap gap-2"
                >
                  {OPTIONS_BY_TAB[activeTab].map((opt) => {
                    const selected = value?.kind === activeTab && value.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => selectChip(activeTab, opt.value)}
                        aria-pressed={selected}
                        className={`rounded-pill px-4 py-[9px] text-[13.5px] font-semibold shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                          selected
                            ? "border border-primary bg-surface-raised text-primary"
                            : "border border-border bg-surface text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
