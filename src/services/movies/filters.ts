// The movie-pool filters (PRD section 11-12), shared by the picker UI, the
// server-side validation and the TMDB provider. Deliberately free of any
// server-only code so client components can import it too.

export const MOVIE_GENRES = [
  { value: "action", label: "Action" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "horror", label: "Horror" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "animation", label: "Animation" },
] as const;

export const MOVIE_DISCOVER_OPTIONS = [
  { value: "now_playing_india", label: "Now Playing in India" },
  { value: "popular", label: "Popular Right Now" },
  { value: "top_rated", label: "Top Rated" },
] as const;

export const MOVIE_LANGUAGES = [
  { value: "hindi", label: "Bollywood" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "malayalam", label: "Malayalam" },
  { value: "marathi", label: "Marathi" },
] as const;

export type MovieGenreSlug = (typeof MOVIE_GENRES)[number]["value"];
export type MovieDiscoverSlug = (typeof MOVIE_DISCOVER_OPTIONS)[number]["value"];
export type MovieLanguageSlug = (typeof MOVIE_LANGUAGES)[number]["value"];

// At most one filter is active per session — each kind is a different way of
// asking TMDB for a list, so they don't combine.
export type MovieFilter =
  | { kind: "genre"; value: MovieGenreSlug }
  | { kind: "discover"; value: MovieDiscoverSlug }
  | { kind: "language"; value: MovieLanguageSlug };

export const MOVIE_FILTER_OPTIONS: Record<
  MovieFilter["kind"],
  readonly { value: string; label: string }[]
> = {
  genre: MOVIE_GENRES,
  discover: MOVIE_DISCOVER_OPTIONS,
  language: MOVIE_LANGUAGES,
};

export function isValidMovieFilter(raw: unknown): raw is MovieFilter {
  if (typeof raw !== "object" || raw === null) return false;
  const { kind, value } = raw as { kind?: unknown; value?: unknown };
  const options = MOVIE_FILTER_OPTIONS[kind as MovieFilter["kind"]];
  return Boolean(options?.some((o) => o.value === value));
}
