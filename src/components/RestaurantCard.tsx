"use client";

import { useState } from "react";
import type { ItemRow } from "@/services/candidates";
import { DetailSheet } from "@/components/DetailSheet";

// PRD section 23: name, cuisine, rating, price, distance, open status — the
// swipe card stays this simple, same split as MovieCard: photos/address/map
// links are one ⓘ tap away in the detail sheet (PRD section 24), not fetched
// again here since the candidate pool already carries this much metadata.
export function RestaurantCard({ item }: { item: ItemRow }) {
  const [showDetail, setShowDetail] = useState(false);
  const meta = item.metadata as {
    cuisine?: string | null;
    rating?: number | null;
    priceLabel?: string | null;
    address?: string | null;
    openNow?: boolean | null;
    distanceKm?: number | null;
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-card bg-surface shadow-xl">
      <div className="flex-1 min-h-0 bg-surface-raised">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-muted">
            No photo available
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-xl font-bold leading-tight tracking-tight">{item.title}</h3>
        <p className="text-sm text-foreground-muted">
          {[meta.cuisine, meta.address].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm font-semibold">
          {[
            typeof meta.rating === "number" ? `⭐ ${meta.rating.toFixed(1)}` : null,
            meta.priceLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-sm text-foreground-muted">
          {[
            typeof meta.distanceKm === "number" ? `${meta.distanceKm} km` : null,
            meta.openNow === true ? "Open now" : meta.openNow === false ? "Closed" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <button
        type="button"
        aria-label="More details"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setShowDetail(true)}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-pill bg-black/50 text-lg font-bold text-white backdrop-blur-sm"
      >
        ⓘ
      </button>

      {showDetail && <DetailSheet item={item} onClose={() => setShowDetail(false)} />}
    </div>
  );
}
