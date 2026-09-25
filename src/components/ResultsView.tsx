"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { SessionRow } from "@/services/sessions";
import type { MatchRow } from "@/services/matching";
import type { ItemRow } from "@/services/candidates";
import { ResultCard } from "@/components/ResultCard";
import { DetailSheet } from "@/components/DetailSheet";
import { InstallPrompt } from "@/components/InstallPrompt";
import { buttonSecondary } from "@/lib/ui";

// The reveal is the one moment the whole app builds toward (PRD section
// 32/33) — worth a cascade instead of the whole list appearing at once
// (emil-design-eng: "elements all appear at once" → stagger 30-80ms apart).
// A short delayChildren gives the page a single beat before anything moves,
// rather than the cascade starting the instant the page paints.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// PRD section 32/33: a perfect (100%) match gets a standout "YOU'RE SYNCED"
// treatment; anything else is framed positively, never as a failure.
export function ResultsView({ session, matches }: { session: SessionRow; matches: MatchRow[] }) {
  const [selected, setSelected] = useState<ItemRow | null>(null);
  const perfect = matches.filter((m) => Math.round(m.sync_score) === 100);
  const rest = matches.filter((m) => Math.round(m.sync_score) !== 100);
  const reduceMotion = useReducedMotion();

  // Critically damped, no bounce — same "safe house style" as the rest of
  // the app (apple-design skill), reserved for momentum-driven gestures
  // elsewhere. Reduced motion keeps the fade but drops the lift entirely.
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", bounce: 0, duration: 0.4 } as const,
    },
  };

  return (
    // display: contents keeps this purely an animation-orchestration
    // wrapper — its children still lay out as direct flex items of the
    // parent <main>, so the existing flex-col/gap-8 spacing is untouched.
    <motion.div variants={container} initial="hidden" animate="show" className="contents">
      {/* No unanimous winner: Re-Sync is the real next step, so it sits
          beside the message instead of below a list to scroll past.
          minmax(0, …) tracks stop long text from squeezing "Re-Sync" onto
          two lines. The message uses card corners, not a pill — pills are
          this app's "tappable" signal. */}
      {perfect.length === 0 ? (
        <motion.div
          variants={item}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-stretch gap-3"
        >
          <div className="flex min-w-0 flex-col justify-center gap-1 rounded-card bg-surface-raised px-6 py-4">
            <h1 className="text-base font-bold leading-tight tracking-tight">
              {matches.length === 0 ? "No matches this time 😅" : "No perfect Sync 😅"}
            </h1>
            <p className="text-[12.5px] font-medium leading-snug text-foreground-muted">
              {matches.length === 0
                ? "Nobody agreed on anything this round."
                : "But you found some common ground."}
            </p>
          </div>
          <Link
            href={`/create?category=${session.category}`}
            className="flex items-center justify-center whitespace-nowrap rounded-pill bg-primary px-2 text-[15px] font-bold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
          >
            Re-Sync
          </Link>
        </motion.div>
      ) : (
        <motion.div variants={item} className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">YOU&apos;RE SYNCED ✓</h1>
          <p className="text-foreground-muted">Everyone agreed!</p>
        </motion.div>
      )}

      {perfect.length > 0 && (
        <div className="flex flex-col gap-3">
          {perfect.map((m) => (
            <motion.div key={m.item.id} variants={item}>
              <ResultCard match={m} onTap={() => setSelected(m.item)} />
            </motion.div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-3">
          {perfect.length > 0 && (
            <motion.h2 variants={item} className="text-sm font-semibold text-foreground-muted">
              Other options
            </motion.h2>
          )}
          {rest.map((m) => (
            <motion.div key={m.item.id} variants={item}>
              <ResultCard match={m} onTap={() => setSelected(m.item)} />
            </motion.div>
          ))}
        </div>
      )}

      {/* PRD section 36: MVP Re-Sync simply creates another session — this
          just pre-fills the category so it's one less tap. Only rendered
          here (bottom) when there's already a win to show above it; the
          no-perfect-match version lives at the top instead, see above. */}
      {perfect.length > 0 && (
        <motion.div variants={item}>
          <Link href={`/create?category=${session.category}`} className={`block w-full ${buttonSecondary}`}>
            Re-Sync
          </Link>
        </motion.div>
      )}

      {/* Mounted only here, not app-wide — "after finishing a first
          SyncUp" is the meaningful moment this gets offered at, not on
          first landing. Renders nothing itself until it's actually
          eligible (see InstallPrompt). */}
      <motion.div variants={item}>
        <InstallPrompt />
      </motion.div>

      {selected && <DetailSheet item={selected} onClose={() => setSelected(null)} />}
    </motion.div>
  );
}
