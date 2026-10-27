"use client";

import { useEffect, useState } from "react";
import { getRestaurantCountPreviewAction } from "@/services/restaurants/actions";
import type { RestaurantFilter } from "@/services/restaurants/filters";
import type { LocationValue } from "@/components/LocationPicker";

const DEBOUNCE_MS = 500;
// Places returns at most 20 per batch, so 20 means "20+".
const BATCH_SIZE = 20;

// null when there's nothing worth checking (no filter, or no location).
function previewKey(location: LocationValue, filter: RestaurantFilter | null): string | null {
  if (!filter) return null;
  if (location.coords) {
    return JSON.stringify(["coords", location.coords.lat, location.coords.lng, filter]);
  }
  if (location.label.trim()) return JSON.stringify(["label", location.label.trim(), filter]);
  return null;
}

// Lets the creator spot a too-narrow filter before starting.
export function RestaurantMatchCount({
  location,
  filter,
}: {
  location: LocationValue;
  filter: RestaurantFilter | null;
}) {
  const key = previewKey(location, filter);
  // Tagged with the key it answers, so a stale result is never shown.
  const [result, setResult] = useState<{ key: string; count: number } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const preview = await getRestaurantCountPreviewAction({
        locationLat: location.coords?.lat,
        locationLng: location.coords?.lng,
        locationLabel: location.label,
        filter,
      });
      // A failed check just means nothing shows — never blocks creating
      // the session.
      if (!cancelled && preview.ok) setResult({ key, count: preview.data });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, location.coords, location.label, filter]);

  if (!key || result?.key !== key) return null;

  if (result.count === 0) {
    return (
      <p className="text-xs text-red-500">
        No restaurants match these filters yet — try widening them.
      </p>
    );
  }
  return (
    <p className="text-xs text-foreground-muted">
      {result.count >= BATCH_SIZE ? `${BATCH_SIZE}+` : result.count} restaurant
      {result.count === 1 ? "" : "s"} to start with.
    </p>
  );
}
