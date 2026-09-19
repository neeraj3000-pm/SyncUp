"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ItemRow } from "@/services/candidates";
import { getMovieDetailAction } from "@/services/movies/actions";
import type { MovieDetail } from "@/services/movies";

// PRD section 24/35: "the card helps you decide, the detail view helps you
// investigate" — this is where the data the swipe card deliberately
// skipped (runtime, cast, trailer, streaming) finally gets fetched, and
// only for the one movie someone tapped, not all 50 candidates.
export function DetailSheet({ item, onClose }: { item: ItemRow; onClose: () => void }) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMovieDetailAction(item.external_id).then((result) => {
      if (cancelled) return;
      if (result.ok) setDetail(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [item.external_id]);

  // Rendered via a portal straight into <body>: this sheet can be opened
  // from inside MovieCard, which sits inside DecisionCard's drag wrapper —
  // that wrapper always has an inline `transform` (even `translateX(0px)`
  // at rest), and per the CSS spec any ancestor with a non-`none` transform
  // becomes the containing block for `position: fixed` descendants. Without
  // the portal, this sheet would size/position itself against that
  // (possibly mid-drag, offset) card box instead of the real viewport,
  // which is why the close button could end up positioned off-screen.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
      // React re-implements bubbling through the *component* tree for
      // portals, not the DOM tree — so a pointerdown here still reaches
      // DecisionCard's drag handler above it (MovieCard already guards its
      // own info button the same way). Without this, DecisionCard calls
      // setPointerCapture on itself, which silently retargets the
      // following pointerup/click away from whatever was actually tapped
      // in here (e.g. this Close button), so the button visibly exists but
      // doesn't respond.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-card bg-surface p-6 sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mb-4 ml-auto flex h-8 w-8 items-center justify-center rounded-pill border border-border text-lg"
        >
          ✕
        </button>

        {!detail && !error && <p className="text-foreground-muted">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              {detail.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.imageUrl}
                  alt={detail.title}
                  className="h-40 w-28 flex-shrink-0 rounded-md object-cover"
                />
              ) : null}
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">{detail.title}</h2>
                <p className="text-sm text-foreground-muted">
                  {[
                    detail.year,
                    detail.genres.slice(0, 2).join(", "),
                    detail.runtimeMinutes ? `${detail.runtimeMinutes} min` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-sm font-semibold">⭐ {detail.rating.toFixed(1)}</p>
                {detail.director && (
                  <p className="text-xs text-foreground-muted">Directed by {detail.director}</p>
                )}
              </div>
            </div>

            {detail.description && <p className="text-sm">{detail.description}</p>}

            {detail.cast.length > 0 && (
              <p className="text-sm text-foreground-muted">
                <span className="font-semibold text-foreground">Cast: </span>
                {detail.cast.join(", ")}
              </p>
            )}

            {detail.trailerUrl && (
              <a
                href={detail.trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                Watch Trailer
              </a>
            )}

            <div className="flex flex-col gap-2">
              {detail.streaming.providers.length > 0 && (
                <div className="flex items-center gap-2">
                  {detail.streaming.providers.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.name}
                      src={p.logoUrl}
                      alt={p.name}
                      title={p.name}
                      className="h-8 w-8 rounded-md"
                    />
                  ))}
                </div>
              )}
              {detail.streaming.link ? (
                <a
                  href={detail.streaming.link}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-pill bg-primary px-8 py-4 text-center text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
                >
                  View Options
                </a>
              ) : (
                <p className="text-sm text-foreground-muted">
                  No streaming options found for your region.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
