"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import type { ItemRow } from "@/services/candidates";
import { getMovieDetailAction } from "@/services/movies/actions";
import type { MovieDetail } from "@/services/movies";
import { getRestaurantDetailAction } from "@/services/restaurants/actions";
import type { RestaurantDetail } from "@/services/restaurants";
import { track } from "@/lib/analytics";

// PRD section 24/35: "the card helps you decide, the detail view helps you
// investigate" — this is where the data the swipe card deliberately
// skipped (runtime, cast, trailer, streaming for movies; extra photos,
// website, map for restaurants) finally gets fetched, only for the one
// item someone tapped, not the whole candidate pool.
export function DetailSheet({ item, onClose }: { item: ItemRow; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} title={item.title}>
      {item.category === "WATCH" ? (
        <MovieDetailContent externalId={item.external_id} category={item.category} />
      ) : (
        <RestaurantDetailContent externalId={item.external_id} category={item.category} />
      )}
    </Sheet>
  );
}

function MovieDetailContent({
  externalId,
  category,
}: {
  externalId: string;
  category: string;
}) {
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
          <h2 className="text-xl font-bold leading-tight tracking-tight">{detail.title}</h2>
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
          onClick={() => track("action_clicked", { category, action: "trailer" })}
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
            onClick={() => track("action_clicked", { category, action: "watch" })}
            className="w-full rounded-pill bg-primary px-8 py-4 text-center text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
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

function RestaurantDetailContent({
  externalId,
  category,
}: {
  externalId: string;
  category: string;
}) {
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
          {detail.photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`${detail.title} photo ${i + 1}`}
              className="h-32 w-44 flex-shrink-0 rounded-md object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold leading-tight tracking-tight">{detail.title}</h2>
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
            onClick={() => track("action_clicked", { category, action: "map" })}
            className="w-full rounded-pill border border-border px-8 py-4 text-center text-lg font-semibold shadow-card transition-[background-color,transform,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.97]"
          >
            View on Map
          </a>
        )}
        {detail.websiteUrl ? (
          <a
            href={detail.websiteUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("action_clicked", { category, action: "website" })}
            className="w-full rounded-pill bg-primary px-8 py-4 text-center text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
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
