"use client";

import { useState } from "react";
import type { ItemRow } from "@/services/candidates";
import { DetailSheet } from "@/components/DetailSheet";

// The swipe-card shell shared by every category: image, a details area the
// category fills in, and the ⓘ button that opens the full detail sheet
// (PRD section 24 — closing it returns to the exact same card).
export function ItemCard({
  item,
  imageFallback,
  children,
}: {
  item: ItemRow;
  imageFallback: string;
  children: React.ReactNode;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-card bg-surface shadow-xl">
      <div className="min-h-0 flex-1 bg-surface-raised">
        {item.image_url ? (
          // Plain <img>: provider images are already sized/CDN-hosted, and
          // next/image would need remotePatterns for every provider domain.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            draggable={false}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground-muted">
            {imageFallback}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-xl font-bold leading-tight tracking-tight">{item.title}</h3>
        {children}
      </div>

      {/* stopPropagation on pointerdown keeps the tap from starting
          DecisionCard's drag, which lives on an ancestor element. */}
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
