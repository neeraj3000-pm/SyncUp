import type { ItemRow } from "@/services/candidates";
import { joinParts } from "@/lib/format";
import { ItemCard } from "@/components/ItemCard";

// PRD section 23: only what's needed for a quick decision. Runtime and
// streaming need a per-movie TMDB call, so they wait for the detail sheet.
export function MovieCard({ item }: { item: ItemRow }) {
  const meta = item.metadata as { year?: string | null; genres?: string[]; rating?: number };

  return (
    <ItemCard item={item} imageFallback="No poster available">
      <p className="text-sm text-foreground-muted">
        {joinParts([meta.year, (meta.genres ?? []).slice(0, 2).join(" · ")])}
      </p>
      {typeof meta.rating === "number" && (
        <p className="text-sm font-semibold">⭐ {meta.rating.toFixed(1)}</p>
      )}
    </ItemCard>
  );
}
