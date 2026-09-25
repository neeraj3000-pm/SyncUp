"use client";

import { useEffect, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { joinParts } from "@/lib/format";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { Sheet } from "@/components/Sheet";
import type { ItemRow } from "@/services/candidates";
import { getMovieDetailAction } from "@/services/movies/actions";
import type { MovieDetail } from "@/services/movies";
import { getRestaurantDetailAction } from "@/services/restaurants/actions";
import type { RestaurantDetail } from "@/services/restaurants";

// PRD section 24/35: "the card helps you decide, the detail view helps you
// investigate" — the extra data is fetched only for the item someone
// tapped, never for the whole candidate pool.
export function DetailSheet({ item, onClose }: { item: ItemRow; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} title={item.title}>
      {item.category === "WATCH" ? (
        <MovieDetailContent externalId={item.external_id} />
      ) : (
        <RestaurantDetailContent externalId={item.external_id} />
      )}
    </Sheet>
  );
}

type LoadState<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

function useDetail<T>(
  load: (externalId: string) => Promise<ActionResult<T>>,
  externalId: string,
): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    load(externalId).then((result) => {
      if (cancelled) return;
      setState(
        result.ok ? { status: "ready", data: result.data } : { status: "error", error: result.error },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [load, externalId]);

  return state;
}

function LoadingOrError({ state }: { state: LoadState<unknown> }) {
  if (state.status === "error") return <p className="text-sm text-red-500">{state.error}</p>;
  return <p className="text-foreground-muted">Loading…</p>;
}

function ExternalLink({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`w-full ${primary ? buttonPrimary : buttonSecondary}`}
    >
      {children}
    </a>
  );
}

function MovieDetailContent({ externalId }: { externalId: string }) {
  const state = useDetail<MovieDetail>(getMovieDetailAction, externalId);
  if (state.status !== "ready") return <LoadingOrError state={state} />;
  const detail = state.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        {detail.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.imageUrl}
            alt={detail.title}
            className="h-40 w-28 flex-shrink-0 rounded-md object-cover"
          />
        )}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold leading-tight tracking-tight">{detail.title}</h2>
          <p className="text-sm text-foreground-muted">
            {joinParts([
              detail.year,
              detail.genres.slice(0, 2).join(", "),
              detail.runtimeMinutes ? `${detail.runtimeMinutes} min` : null,
            ])}
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
          <ExternalLink href={detail.streaming.link} primary>
            View Options
          </ExternalLink>
        ) : (
          <p className="text-sm text-foreground-muted">No streaming options found for your region.</p>
        )}
      </div>
    </div>
  );
}

function RestaurantDetailContent({ externalId }: { externalId: string }) {
  const state = useDetail<RestaurantDetail>(getRestaurantDetailAction, externalId);
  if (state.status !== "ready") return <LoadingOrError state={state} />;
  const detail = state.data;

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
          {joinParts([detail.cuisine, detail.address])}
        </p>
        <p className="text-sm font-semibold">
          {joinParts([
            typeof detail.rating === "number" && `⭐ ${detail.rating.toFixed(1)}`,
            detail.priceLabel,
          ])}
        </p>
        {detail.openNow !== null && (
          <p className="text-xs text-foreground-muted">
            {detail.openNow ? "Open now" : "Closed now"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {detail.mapUrl && <ExternalLink href={detail.mapUrl}>View on Map</ExternalLink>}
        {detail.websiteUrl ? (
          <ExternalLink href={detail.websiteUrl} primary>
            Visit Website
          </ExternalLink>
        ) : (
          <p className="text-sm text-foreground-muted">No website found for this restaurant.</p>
        )}
      </div>
    </div>
  );
}
