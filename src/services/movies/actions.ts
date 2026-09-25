"use server";

import type { ActionResult } from "@/lib/action-result";
import { getMovieDetail, type MovieDetail } from "@/services/movies";

export async function getMovieDetailAction(externalId: string): Promise<ActionResult<MovieDetail>> {
  try {
    return { ok: true, data: await getMovieDetail(externalId) };
  } catch (error) {
    console.error("getMovieDetailAction failed:", error);
    return { ok: false, error: "Couldn't load more details for this movie." };
  }
}
