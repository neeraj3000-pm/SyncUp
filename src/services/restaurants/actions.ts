"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  getRestaurantDetail,
  previewRestaurantCount,
  type RestaurantDetail,
  type RestaurantLocation,
} from "@/services/restaurants";
import { normalizeRestaurantFilter } from "@/services/restaurants/filters";
import { isLatitude, isLongitude, normalizeLocationLabel } from "@/lib/validation";

export async function getRestaurantDetailAction(
  externalId: string,
): Promise<ActionResult<RestaurantDetail>> {
  try {
    return { ok: true, data: await getRestaurantDetail(externalId) };
  } catch (error) {
    console.error("getRestaurantDetailAction failed:", error);
    return { ok: false, error: "Couldn't load more details for this restaurant." };
  }
}

// Shows the creator how many restaurants their filters match before
// starting (see previewRestaurantCount).
export async function getRestaurantCountPreviewAction(input: {
  locationLat?: unknown;
  locationLng?: unknown;
  locationLabel?: unknown;
  filter?: unknown;
}): Promise<ActionResult<number>> {
  const filter = normalizeRestaurantFilter(input.filter);
  if (filter === "invalid") return { ok: false, error: "Invalid filter." };

  const label = normalizeLocationLabel(input.locationLabel);
  const location: RestaurantLocation | null =
    isLatitude(input.locationLat) && isLongitude(input.locationLng)
      ? { lat: input.locationLat, lng: input.locationLng }
      : label
        ? { label }
        : null;
  if (!location) return { ok: false, error: "No location set." };

  try {
    return { ok: true, data: await previewRestaurantCount(location, filter) };
  } catch (error) {
    console.error("getRestaurantCountPreviewAction failed:", error);
    return { ok: false, error: "Couldn't check how many results match." };
  }
}
