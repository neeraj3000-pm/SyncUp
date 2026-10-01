"use client";

import { useEffect, useState } from "react";
import { getRestaurantCountPreviewAction } from "@/services/restaurants/actions";
import type { RestaurantFilter } from "@/services/restaurants/filters";
import type { LocationValue } from "@/components/LocationPicker";

const DEBOUNCE_MS = 500;
// The pool itself only ever fetches 20 per batch (Places' own Nearby
// Search cap) — a count of exactly that many means "at least this many,"
// not "exactly this many."
const BATCH_SIZE = 20;

// Identifies exactly what a count would be checking against — "All
// Restaurants" (no filter) or no location yet both have nothing worth
// checking, so there's no key for them at all.
function previewKey(location: LocationValue, filter: RestaurantFilter | null): string | null {
  if (!filter) return null;
  if (location.coords) {
    return JSON.stringify(["coords", location.coords.lat, location.coords.lng, filter]);
  }
  if (location.label.trim()) return JSON.stringify(["label", location.label.trim(), filter]);
  return null;
}

// Shown only to whoever is filling out the create form — which is always
// the session's creator, since joiners never see this screen or pick
// filters — so a narrow combination (several cuisines plus Open Now plus a
// tight radius) can be spotted before starting a session with almost
// nothing to swipe on, rather than after.
export function RestaurantMatchCount({
  location,
  filter,
}: {
  location: LocationValue;
  filter: RestaurantFilter | null;
}) {
  const key = previewKey(location, filter);
  // Tagged with the key it answers, so a result from a filter/location
  // that's since changed is simply never shown — no separate "clear the
  // stale value" step needed, render just compares keys.
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
