import type { ItemRow } from "@/services/candidates";

// PRD section 23: the card shows only what's needed for a quick decision —
// poster, title, year, genre, rating. Runtime and streaming availability
// need a separate per-movie TMDB call each, so they're deferred to the
// detail view (Sprint 4) rather than fetched for all 50 cards up front.
export function MovieCard({ item }: { item: ItemRow }) {
  const meta = item.metadata as { year?: string | null; genres?: string[]; rating?: number };
  const genres = (meta.genres ?? []).slice(0, 2).join(" · ");

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-card bg-surface shadow-xl">
      <div className="relative flex-1 min-h-0 bg-surface-raised">
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
        <h3 className="text-xl font-bold leading-tight">{item.title}</h3>
        <p className="text-sm text-foreground-muted">
          {[meta.year, genres].filter(Boolean).join(" · ")}
        </p>
        {typeof meta.rating === "number" && (
          <p className="text-sm font-semibold">⭐ {meta.rating.toFixed(1)}</p>
        )}
      </div>
    </div>
  );
}
