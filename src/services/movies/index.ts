import "server-only";
import type {
  MovieFilter,
  MovieGenreSlug,
  MovieLanguageSlug,
} from "@/services/movies/filters";

// PRD section 37: movie content flows through a provider abstraction, never
// called directly from the UI. TMDB is the provider (CLAUDE.md — chosen
// during implementation, not named in the PRD itself).
const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

interface TmdbMovieSummary {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TmdbListResponse {
  page: number;
  results: TmdbMovieSummary[];
  total_pages: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

// TMDB's own genre ids (from /genre/movie/list) — fixed and stable enough
// to hardcode for the 8 this app actually offers, rather than resolving a
// slug through getGenreMap() (built for the opposite direction: id → name,
// for card metadata) on every candidate-pool generation.
const GENRE_TMDB_IDS: Record<MovieGenreSlug, number> = {
  action: 28,
  comedy: 35,
  drama: 18,
  horror: 27,
  "sci-fi": 878,
  thriller: 53,
  romance: 10749,
  animation: 16,
};

// ISO 639-1 codes, for TMDB's with_original_language discover param.
const LANGUAGE_ISO_CODES: Record<MovieLanguageSlug, string> = {
  hindi: "hi",
  tamil: "ta",
  telugu: "te",
  kannada: "kn",
  malayalam: "ml",
  marathi: "mr",
};

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
    // Genre names and popular-movie pages change slowly; caching keeps
    // repeated candidate-pool generations from re-fetching identical pages.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

let genreMapPromise: Promise<Map<number, string>> | null = null;

// Module-level cache: the genre list is effectively static. A failed fetch
// is dropped from the cache rather than kept, or every later pool
// generation on this server instance would reuse the same rejection.
function getGenreMap(): Promise<Map<number, string>> {
  genreMapPromise ??= tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list")
    .then((data) => new Map(data.genres.map((g) => [g.id, g.name])))
    .catch((error) => {
      genreMapPromise = null;
      throw error;
    });
  return genreMapPromise;
}

export interface NormalizedItem {
  external_id: string;
  source: string;
  title: string;
  description: string | null;
  image_url: string | null;
  metadata: Record<string, unknown>;
}

function normalizeMovie(raw: TmdbMovieSummary, genreMap: Map<number, string>): NormalizedItem {
  return {
    external_id: String(raw.id),
    source: "tmdb",
    title: raw.title,
    description: raw.overview || null,
    image_url: raw.poster_path ? `${POSTER_BASE}${raw.poster_path}` : null,
    metadata: {
      year: raw.release_date ? raw.release_date.slice(0, 4) : null,
      genres: raw.genre_ids.map((id) => genreMap.get(id)).filter(Boolean),
      rating: raw.vote_average,
    },
  };
}

// Batch 1 reads TMDB pages 1-3, batch 2 reads pages 4-6, and so on — this is
// how "Show Me 50 More" (PRD section 12) gets a different set of movies
// instead of repeating the first batch. session_items itself also dedupes
// against whatever the session has already shown (see services/candidates).
const PAGES_PER_BATCH = 3;

// Turns a UI-picked filter into the actual TMDB request — the one place
// that knows which endpoint/param each filter kind needs, so neither the
// UI nor the category-agnostic candidate-pool pipeline has to.
function buildPoolQuery(filter: MovieFilter | null): {
  path: string;
  params: Record<string, string>;
} {
  if (!filter) return { path: "/movie/popular", params: {} };

  if (filter.kind === "genre") {
    return {
      path: "/discover/movie",
      params: { with_genres: String(GENRE_TMDB_IDS[filter.value]), sort_by: "popularity.desc" },
    };
  }
  if (filter.kind === "language") {
    return {
      path: "/discover/movie",
      params: {
        with_original_language: LANGUAGE_ISO_CODES[filter.value],
        sort_by: "popularity.desc",
      },
    };
  }
  // filter.kind === "discover"
  if (filter.value === "now_playing_india") {
    // PRD's own ask: movies currently in Indian theaters, not just
    // "recently released" — now_playing + region is TMDB's actual
    // theatrical-release data, not an approximation via date filtering.
    return { path: "/movie/now_playing", params: { region: "IN" } };
  }
  if (filter.value === "top_rated") return { path: "/movie/top_rated", params: {} };
  return { path: "/movie/popular", params: {} }; // "popular"
}

export async function getMoviePool(
  batchNumber: number,
  filter: MovieFilter | null = null,
  count = 50,
): Promise<NormalizedItem[]> {
  const startPage = (batchNumber - 1) * PAGES_PER_BATCH + 1;
  const { path, params } = buildPoolQuery(filter);
  const [genreMap, ...pages] = await Promise.all([
    getGenreMap(),
    ...Array.from({ length: PAGES_PER_BATCH }, (_, i) =>
      tmdbFetch<TmdbListResponse>(path, { ...params, page: String(startPage + i) }),
    ),
  ]);

  const seen = new Set<number>();
  const movies: NormalizedItem[] = [];
  for (const page of pages) {
    for (const raw of page.results) {
      if (seen.has(raw.id) || !raw.poster_path) continue;
      seen.add(raw.id);
      movies.push(normalizeMovie(raw, genreMap));
      if (movies.length >= count) return movies;
    }
  }
  return movies;
}

// ── movie detail (detail sheet only) ───────────────────────────────────
// Runtime, cast, trailer, and streaming availability all need per-movie
// TMDB calls the candidate pool deliberately skips (see MovieCard.tsx's
// comment) — fetching this for all 50 swipe candidates would be slow and
// TMDB-call-heavy, but it's cheap for the handful of items that actually
// end up in a result list. `append_to_response` combines what would
// otherwise be three separate requests into one.

const LOGO_BASE = "https://image.tmdb.org/t/p/w92";
// PRD section 38's example market — India (Netflix/Prime/JioHotstar).
const STREAMING_REGION = "IN";

interface TmdbCastMember {
  name: string;
  order: number;
}

interface TmdbCrewMember {
  job: string;
  name: string;
}

interface TmdbVideo {
  site: string;
  type: string;
  key: string;
  official: boolean;
}

interface TmdbWatchProvider {
  provider_name: string;
  logo_path: string;
}

interface TmdbWatchProvidersRegion {
  link?: string;
  flatrate?: TmdbWatchProvider[];
}

interface TmdbGenreObject {
  id: number;
  name: string;
}

// The detail endpoint's shape differs from the list/summary endpoints
// (TmdbMovieSummary) in one significant way: genres come back as full
// {id, name} objects here, not the bare genre_ids array popular/discover
// use — so no genre-name lookup table is needed for this path at all.
interface TmdbMovieDetailResponse {
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genres: TmdbGenreObject[];
  runtime: number | null;
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: { results: Record<string, TmdbWatchProvidersRegion> };
}

export interface MovieDetail {
  title: string;
  description: string | null;
  imageUrl: string | null;
  year: string | null;
  genres: string[];
  rating: number;
  runtimeMinutes: number | null;
  director: string | null;
  cast: string[];
  trailerUrl: string | null;
  streaming: { link: string | null; providers: { name: string; logoUrl: string }[] };
}

export async function getMovieDetail(externalId: string): Promise<MovieDetail> {
  // Interpolated into the request path, so only a real TMDB id gets through.
  if (!/^\d+$/.test(externalId)) throw new Error("Invalid TMDB id");
  const detail = await tmdbFetch<TmdbMovieDetailResponse>(`/movie/${externalId}`, {
    append_to_response: "credits,videos,watch/providers",
  });

  const director = detail.credits?.crew.find((c) => c.job === "Director")?.name ?? null;
  const cast = (detail.credits?.cast ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 5)
    .map((c) => c.name);

  const trailer = (detail.videos?.results ?? []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  const region = detail["watch/providers"]?.results?.[STREAMING_REGION];

  return {
    title: detail.title,
    description: detail.overview || null,
    imageUrl: detail.poster_path ? `${POSTER_BASE}${detail.poster_path}` : null,
    year: detail.release_date ? detail.release_date.slice(0, 4) : null,
    genres: detail.genres.map((g) => g.name),
    rating: detail.vote_average,
    runtimeMinutes: detail.runtime,
    director,
    cast,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    streaming: {
      link: region?.link ?? null,
      providers: (region?.flatrate ?? []).map((p) => ({
        name: p.provider_name,
        logoUrl: `${LOGO_BASE}${p.logo_path}`,
      })),
    },
  };
}
