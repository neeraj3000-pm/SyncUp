"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ItemRow } from "@/services/candidates";
import { getMovieDetailAction } from "@/services/movies/actions";
import type { MovieDetail } from "@/services/movies";
import { getRestaurantDetailAction } from "@/services/restaurants/actions";
import type { RestaurantDetail } from "@/services/restaurants";

// PRD section 24/35: "the card helps you decide, the detail view helps you
// investigate" — this is where the data the swipe card deliberately
// skipped (runtime, cast, trailer, streaming for movies; extra photos,
// website, map for restaurants) finally gets fetched, only for the one
// item someone tapped, not the whole candidate pool.
export function DetailSheet({ item, onClose }: { item: ItemRow; onClose: () => void }) {
  return (
    <DetailSheetShell onClose={onClose}>
      {item.category === "WATCH" ? (
        <MovieDetailContent externalId={item.external_id} />
      ) : (
        <RestaurantDetailContent externalId={item.external_id} />
      )}
    </DetailSheetShell>
  );
}

// The shell owns the portal/backdrop/close-button mechanics — the one part
// that's genuinely category-agnostic — so the category switch above is the
// only place in this file that knows movies and restaurants are different.
function DetailSheetShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Rendered via a portal straight into <body>: this sheet can be opened
  // from inside a card that sits inside DecisionCard's drag wrapper — that
  // wrapper always has an inline `transform` (even `translateX(0px)` at
  // rest), and per the CSS spec any ancestor with a non-`none` transform
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
      // DecisionCard's drag handler above it (the swipe cards' own info
      // buttons already guard against this the same way). Without this,
      // DecisionCard calls setPointerCapture on itself, which silently
      // retargets the following pointerup/click away from whatever was
      // actually tapped in here (e.g. this Close button), so the button
      // visibly exists but doesn't respond.
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
        {children}
      </div>
    </div>,
    document.body,
  );
}

function MovieDetailContent({ externalId }: { externalId: string }) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMovieDetailAction(externalId).then((result) => {
      if (cancelled) return;
      if (result.ok) setDetail(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [externalId]);

  if (!detail && !error) return <p className="text-foreground-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!detail) return null;

  return (
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
  );
}

function RestaurantDetailContent({ externalId }: { externalId: string }) {
  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRestaurantDetailAction(externalId).then((result) => {
      if (cancelled) return;
      if (result.ok) setDetail(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [externalId]);

  if (!detail && !error) return <p className="text-foreground-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!detail) return null;

  return (
    <div className="flex flex-col gap-4">
      {detail.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {detail.photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={detail.title}
              className="h-32 w-44 flex-shrink-0 rounded-md object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold leading-tight">{detail.title}</h2>
        <p className="text-sm text-foreground-muted">
          {[detail.cuisine, detail.address].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm font-semibold">
          {[
            typeof detail.rating === "number" ? `⭐ ${detail.rating.toFixed(1)}` : null,
            detail.priceLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {detail.openNow !== null && (
          <p className="text-xs text-foreground-muted">
            {detail.openNow ? "Open now" : "Closed now"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {detail.mapUrl && (
          <a
            href={detail.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-pill border border-border px-8 py-4 text-center text-lg font-semibold transition-colors hover:bg-surface-raised"
          >
            View on Map
          </a>
        )}
        {detail.websiteUrl ? (
          <a
            href={detail.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full rounded-pill bg-primary px-8 py-4 text-center text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
          >
            Visit Website
          </a>
        ) : (
          <p className="text-sm text-foreground-muted">No website found for this restaurant.</p>
        )}
      </div>
    </div>
  );
}
