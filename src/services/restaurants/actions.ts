"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  getRestaurantDetail,
  previewRestaurantCount,
  type RestaurantDetail,
  type RestaurantLocation,
} from "@/services/restaurants";
import { normalizeRestaurantFilter } from "@/services/restaurants/filters";

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

const MAX_LOCATION_LABEL_LENGTH = 100;

function isLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 90;
}

function isLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 180;
}

// Lets the create page show the host roughly how many restaurants their
// current filters match, before they commit to starting the session with
// them — see previewRestaurantCount's own comment. Only ever used from the
// create form, which only the session's creator sees (joiners never pick
// filters), so this is already host-only without any extra gating.
export async function getRestaurantCountPreviewAction(input: {
  locationLat?: unknown;
  locationLng?: unknown;
  locationLabel?: unknown;
  filter?: unknown;
}): Promise<ActionResult<number>> {
  const filter = normalizeRestaurantFilter(input.filter);
  if (filter === "invalid") return { ok: false, error: "Invalid filter." };

  const location: RestaurantLocation | null =
    isLatitude(input.locationLat) && isLongitude(input.locationLng)
      ? { lat: input.locationLat, lng: input.locationLng }
      : typeof input.locationLabel === "string" && input.locationLabel.trim()
        ? { label: input.locationLabel.trim().slice(0, MAX_LOCATION_LABEL_LENGTH) }
        : null;
  if (!location) return { ok: false, error: "No location set." };

  try {
    return { ok: true, data: await previewRestaurantCount(location, filter) };
  } catch (error) {
    console.error("getRestaurantCountPreviewAction failed:", error);
    return { ok: false, error: "Couldn't check how many results match." };
  }
}
