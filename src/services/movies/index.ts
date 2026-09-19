import "server-only";

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

function getGenreMap(): Promise<Map<number, string>> {
  // Module-level cache: the genre list is effectively static, no reason to
  // refetch it once per candidate-pool generation.
  genreMapPromise ??= tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list").then(
    (data) => new Map(data.genres.map((g) => [g.id, g.name])),
  );
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

export async function getMoviePool(batchNumber: number, count = 50): Promise<NormalizedItem[]> {
  const genreMap = await getGenreMap();
  const startPage = (batchNumber - 1) * PAGES_PER_BATCH + 1;
  const pages = await Promise.all(
    Array.from({ length: PAGES_PER_BATCH }, (_, i) =>
      tmdbFetch<TmdbListResponse>("/movie/popular", { page: String(startPage + i) }),
    ),
  );

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

// ── movie detail (Sprint 4 results/detail view only) ───────────────────
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

interface TmdbMovieDetailResponse extends TmdbMovieSummary {
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
  const [detail, genreMap] = await Promise.all([
    tmdbFetch<TmdbMovieDetailResponse>(`/movie/${externalId}`, {
      append_to_response: "credits,videos,watch/providers",
    }),
    getGenreMap(),
  ]);

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
    genres: detail.genre_ids.map((id) => genreMap.get(id)).filter((g): g is string => Boolean(g)),
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
