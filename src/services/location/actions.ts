"use server";

import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/validation";
import {
  getLocationDetail,
  getLocationSuggestions,
  type LocationDetail,
  type LocationSuggestion,
} from "@/services/location";

const MAX_INPUT_LENGTH = 100;

export async function getLocationSuggestionsAction(
  input: string,
  sessionToken: string,
): Promise<ActionResult<LocationSuggestion[]>> {
  if (typeof input !== "string" || input.length > MAX_INPUT_LENGTH || !isUuid(sessionToken)) {
    return { ok: false, error: "Invalid request." };
  }
  try {
    return { ok: true, data: await getLocationSuggestions(input, sessionToken) };
  } catch (error) {
    console.error("getLocationSuggestionsAction failed:", error);
    return { ok: false, error: "Couldn't load suggestions." };
  }
}

export async function getLocationDetailAction(
  placeId: string,
  sessionToken: string,
): Promise<ActionResult<LocationDetail>> {
  if (typeof placeId !== "string" || placeId.length === 0 || !isUuid(sessionToken)) {
    return { ok: false, error: "Invalid request." };
  }
  try {
    const detail = await getLocationDetail(placeId, sessionToken);
    if (!detail) return { ok: false, error: "Couldn't resolve that location." };
    return { ok: true, data: detail };
  } catch (error) {
    console.error("getLocationDetailAction failed:", error);
    return { ok: false, error: "Couldn't resolve that location." };
  }
}
