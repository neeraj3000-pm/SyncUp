"use server";

import type { ActionResult } from "@/lib/action-result";
import { getRestaurantDetail, type RestaurantDetail } from "@/services/restaurants";

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
