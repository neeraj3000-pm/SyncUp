"use server";

import { getRestaurantDetail, type RestaurantDetail } from "@/services/restaurants";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getRestaurantDetailAction(
  externalId: string,
): Promise<ActionResult<RestaurantDetail>> {
  try {
    const detail = await getRestaurantDetail(externalId);
    return { ok: true, data: detail };
  } catch (error) {
    console.error("getRestaurantDetailAction failed:", error);
    return { ok: false, error: "Couldn't load more details for this restaurant." };
  }
}
