"use client";

import { useState } from "react";
import type { ItemRow } from "@/services/candidates";
import { DetailSheet } from "@/components/DetailSheet";

// PRD section 23: the card shows only what's needed for a quick decision —
// poster, title, year, genre, rating. Runtime and streaming availability
// need a separate per-movie TMDB call each, so they're deferred to the
// info-button detail sheet (PRD section 24) rather than fetched for all 50
// cards up front.
export function MovieCard({ item }: { item: ItemRow }) {
  const [showDetail, setShowDetail] = useState(false);
  const meta = item.metadata as { year?: string | null; genres?: string[]; rating?: number };
  const genres = (meta.genres ?? []).slice(0, 2).join(" · ");

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-card bg-surface shadow-xl">
      <div className="flex-1 min-h-0 bg-surface-raised">
        {item.image_url ? (
          // MVP: plain <img> avoids configuring next/image remotePatterns for now.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-muted">
            No poster available
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-xl font-bold leading-tight tracking-tight">{item.title}</h3>
        <p className="text-sm text-foreground-muted">
          {[meta.year, genres].filter(Boolean).join(" · ")}
        </p>
        {typeof meta.rating === "number" && (
          <p className="text-sm font-semibold">⭐ {meta.rating.toFixed(1)}</p>
        )}
      </div>

      {/* A direct overlay on the whole card (not nested inside the poster's
          own flex sub-container) so it isn't at the mercy of that
          container's own layout/stacking behavior.
          stopPropagation on pointerdown keeps it independent of
          DecisionCard's drag handling, which lives on an ancestor element. */}
      <button
        type="button"
        aria-label="More details"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setShowDetail(true)}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-pill bg-black/50 text-lg font-bold text-white backdrop-blur-sm"
      >
        ⓘ
      </button>

      {/* PRD section 24: "the user can close the detail view and return to
          the exact same card" — this is purely a local overlay, so closing
          it does exactly that with no state to reconcile. */}
      {showDetail && <DetailSheet item={item} onClose={() => setShowDetail(false)} />}
    </div>
  );
}
