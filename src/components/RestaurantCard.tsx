import type { ItemRow } from "@/services/candidates";
import { joinParts } from "@/lib/format";
import { ItemCard } from "@/components/ItemCard";

// PRD section 23: name, cuisine, rating, price, distance, open status.
// Extra photos, website and map links wait for the detail sheet.
export function RestaurantCard({ item }: { item: ItemRow }) {
  const meta = item.metadata as {
    cuisine?: string | null;
    rating?: number | null;
    priceLabel?: string | null;
    address?: string | null;
    openNow?: boolean | null;
    distanceKm?: number | null;
  };

  return (
    <ItemCard item={item} imageFallback="No photo available">
      <p className="text-sm text-foreground-muted">{joinParts([meta.cuisine, meta.address])}</p>
      <p className="text-sm font-semibold">
        {joinParts([
          typeof meta.rating === "number" && `⭐ ${meta.rating.toFixed(1)}`,
          meta.priceLabel,
        ])}
      </p>
      <p className="text-sm text-foreground-muted">
        {joinParts([
          typeof meta.distanceKm === "number" && `${meta.distanceKm} km`,
          meta.openNow === true ? "Open now" : meta.openNow === false ? "Closed" : null,
        ])}
      </p>
    </ItemCard>
  );
}
