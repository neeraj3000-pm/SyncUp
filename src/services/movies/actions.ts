"use server";

import { getMovieDetail, type MovieDetail } from "@/services/movies";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getMovieDetailAction(externalId: string): Promise<ActionResult<MovieDetail>> {
  try {
    const detail = await getMovieDetail(externalId);
    return { ok: true, data: detail };
  } catch (error) {
    console.error("getMovieDetailAction failed:", error);
    return { ok: false, error: "Couldn't load more details for this movie." };
  }
}
