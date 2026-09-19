"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionRow } from "@/services/sessions";
import type { MatchRow } from "@/services/matching";
import type { ItemRow } from "@/services/candidates";
import { ResultCard } from "@/components/ResultCard";
import { DetailSheet } from "@/components/DetailSheet";

// PRD section 32/33: a perfect (100%) match gets a standout "YOU'RE SYNCED"
// treatment; anything else is framed positively, never as a failure.
export function ResultsView({ session, matches }: { session: SessionRow; matches: MatchRow[] }) {
  const [selected, setSelected] = useState<ItemRow | null>(null);
  const perfect = matches.filter((m) => Math.round(m.sync_score) === 100);
  const rest = matches.filter((m) => Math.round(m.sync_score) !== 100);

  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">
          {matches.length === 0
            ? "No matches this time 😅"
            : perfect.length > 0
              ? "YOU'RE SYNCED ✓"
              : "No perfect Sync 😅"}
        </h1>
        <p className="text-foreground-muted">
          {matches.length === 0
            ? "Nobody agreed on anything this round — try a Re-Sync."
            : perfect.length > 0
              ? "Everyone agreed!"
              : "But you found some common ground."}
        </p>
      </div>

      {perfect.length > 0 && (
        <div className="flex flex-col gap-3">
          {perfect.map((m) => (
            <ResultCard key={m.item.id} match={m} onTap={() => setSelected(m.item)} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-3">
          {perfect.length > 0 && (
            <h2 className="text-sm font-semibold text-foreground-muted">Other options</h2>
          )}
          {rest.map((m) => (
            <ResultCard key={m.item.id} match={m} onTap={() => setSelected(m.item)} />
          ))}
        </div>
      )}

      {/* PRD section 36: MVP Re-Sync simply creates another session — this
          just pre-fills the category so it's one less tap. */}
      <Link
        href={`/create?category=${session.category}`}
        className="w-full rounded-pill border border-border px-8 py-4 text-center text-lg font-semibold transition-colors hover:bg-surface-raised"
      >
        Re-Sync
      </Link>

      {selected && <DetailSheet item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
