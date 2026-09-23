"use server";

import {
  getLocationDetail,
  getLocationSuggestions,
  type LocationDetail,
  type LocationSuggestion,
} from "@/services/location";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getLocationSuggestionsAction(
  input: string,
  sessionToken: string,
): Promise<ActionResult<LocationSuggestion[]>> {
  try {
    const suggestions = await getLocationSuggestions(input, sessionToken);
    return { ok: true, data: suggestions };
  } catch (error) {
    console.error("getLocationSuggestionsAction failed:", error);
    return { ok: false, error: "Couldn't load suggestions." };
  }
}

export async function getLocationDetailAction(
  placeId: string,
  sessionToken: string,
): Promise<ActionResult<LocationDetail>> {
  try {
    const detail = await getLocationDetail(placeId, sessionToken);
    if (!detail) return { ok: false, error: "Couldn't resolve that location." };
    return { ok: true, data: detail };
  } catch (error) {
    console.error("getLocationDetailAction failed:", error);
    return { ok: false, error: "Couldn't resolve that location." };
  }
}
