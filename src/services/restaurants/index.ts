import "server-only";
import type { NormalizedItem } from "@/services/movies";

// PRD section 39: restaurant content flows through a provider abstraction,
// never called directly from the UI. Google Places API (New) is the
// provider (CLAUDE.md — chosen during scoping).
const PLACES_BASE = "https://places.googleapis.com/v1";

// Rating/price/opening-hours fields put every search call under Places'
// "Enterprise" SKU tier rather than the cheaper "Essentials" one — worth
// knowing since Enterprise's free monthly allowance is smaller (1,000/month
// vs. 10,000), but the PRD's restaurant card (section 23) needs all three,
// so there's no cheaper field selection that still meets scope.
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.primaryTypeDisplayName",
  "places.location",
  "places.photos",
  "places.currentOpeningHours.openNow",
  "places.rating",
  "places.priceLevel",
].join(",");

function apiKey(): string {
  return process.env.GOOGLE_PLACES_API_KEY ?? "";
}

interface PlacesLatLng {
  latitude: number;
  longitude: number;
}

interface PlacesResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text: string };
  location?: PlacesLatLng;
  photos?: { name: string }[];
  currentOpeningHours?: { openNow?: boolean };
  rating?: number;
  priceLevel?: string;
}

interface PlacesSearchResponse {
  places?: PlacesResult[];
}

async function placesSearch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${PLACES_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Places search failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Place Photo (New) normally 302-redirects straight to the image, which
// would mean embedding our API key in an <img src> the browser can read —
// exactly what CLAUDE.md's security rule forbids. skipHttpRedirect=true
// instead returns a JSON body with a pre-authenticated googleusercontent.com
// URL that needs no key at all, safe to hand to the client the same way a
// plain TMDB poster URL already is.
async function resolvePhotoUrl(photoName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": apiKey() } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch {
    // A missing/broken photo shouldn't take down the whole pool — the card
    // already has a "No poster available" fallback for a null image_url.
    return null;
  }
}

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "₹",
  PRICE_LEVEL_MODERATE: "₹₹",
  PRICE_LEVEL_EXPENSIVE: "₹₹₹",
  PRICE_LEVEL_VERY_EXPENSIVE: "₹₹₹₹",
};

// PRD section 13's "Step 2 — narrow the pool." Unlike MovieFilter (one of
// three mutually-exclusive query strategies), these are independent axes a
// person can combine freely — "Italian, Budget, Open Now" is a perfectly
// normal thing to want all at once — so this is a plain object of optional
// fields rather than a tagged union. Exported slug lists let the UI and
// services/sessions/actions.ts's validation share one source of truth, same
// pattern as MOVIE_GENRE_SLUGS etc.
export type RestaurantCuisineSlug =
  | "indian"
  | "chinese"
  | "italian"
  | "cafe"
  | "fast_food"
  | "bakery";
export type RestaurantPriceSlug = "budget" | "mid_range" | "fine_dining";

export interface RestaurantFilter {
  cuisine: RestaurantCuisineSlug | null;
  price: RestaurantPriceSlug | null;
  openNow: boolean;
  // Only meaningful with coordinate-based location ("Use my location" or a
  // picked suggestion) — a typed free-text area has no center to measure
  // from, so RestaurantFilterPicker hides this tab in that case and
  // getRestaurantPool's text-search path below simply never reads it.
  distanceKm: number | null;
}

export const RESTAURANT_CUISINE_SLUGS: readonly RestaurantCuisineSlug[] = [
  "indian",
  "chinese",
  "italian",
  "cafe",
  "fast_food",
  "bakery",
];
export const RESTAURANT_PRICE_SLUGS: readonly RestaurantPriceSlug[] = [
  "budget",
  "mid_range",
  "fine_dining",
];
// km — the choices offered on the Distance tab; getRestaurantPool below
// uses whichever one's picked as the Nearby Search base radius.
export const RESTAURANT_DISTANCE_KM_OPTIONS: readonly number[] = [2, 5, 10, 20];

// Places (New) type taxonomy has no India-specific "North/South Indian"
// split — "indian_restaurant" is the closest real type, and the rest are
// the cuisines actually common in Indian food-delivery/dining-out apps.
const CUISINE_PLACE_TYPES: Record<RestaurantCuisineSlug, string> = {
  indian: "indian_restaurant",
  chinese: "chinese_restaurant",
  italian: "italian_restaurant",
  cafe: "cafe",
  fast_food: "fast_food_restaurant",
  bakery: "bakery",
};

// Places' priceLevel enum has 4 steps; MVP trims that to 3 buckets for the
// same reason the movie filters got trimmed from 19 options to fewer — a
// person picking "how expensive" rarely means to distinguish "Expensive"
// from "Very Expensive," so Fine Dining covers both.
const PRICE_SLUG_LEVELS: Record<RestaurantPriceSlug, readonly string[]> = {
  budget: ["PRICE_LEVEL_INEXPENSIVE"],
  mid_range: ["PRICE_LEVEL_MODERATE"],
  fine_dining: ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"],
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function normalizeRestaurant(
  place: PlacesResult,
  imageUrl: string | null,
  distanceKm: number | null,
): NormalizedItem {
  return {
    external_id: place.id,
    source: "google_places",
    title: place.displayName?.text ?? "Unnamed restaurant",
    // No restaurant-description field in the PRD's detail list (section 24,
    // unlike movies) — cuisine/rating/price/address already cover it.
    description: null,
    image_url: imageUrl,
    metadata: {
      cuisine: place.primaryTypeDisplayName?.text ?? null,
      rating: place.rating ?? null,
      priceLabel: place.priceLevel ? (PRICE_LABELS[place.priceLevel] ?? null) : null,
      address: place.formattedAddress ?? null,
      openNow: place.currentOpeningHours?.openNow ?? null,
      distanceKm,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
    },
  };
}

// ── restaurant detail (detail sheet only) ───────────────────────────────
// The swipe card's own metadata already has cuisine/rating/price/address/
// distance (unlike movies, restaurants don't need a separate "skip the
// expensive fields for the pool" split), but photos beyond the first one,
// the website, and a map link aren't worth fetching for all 20-50 pool
// candidates — same reasoning as MovieCard deferring runtime/cast/trailer.
const DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "primaryTypeDisplayName",
  "rating",
  "priceLevel",
  "currentOpeningHours.openNow",
  "photos",
  "websiteUri",
  "googleMapsUri",
].join(",");

interface PlacesDetailResponse extends PlacesResult {
  websiteUri?: string;
  googleMapsUri?: string;
}

export interface RestaurantDetail {
  title: string;
  imageUrl: string | null;
  photos: string[];
  cuisine: string | null;
  rating: number | null;
  priceLabel: string | null;
  address: string | null;
  openNow: boolean | null;
  // Places has no generic "order online" link — a restaurant's own website
  // is the closest MVP equivalent (PRD section 24's "ordering link where
  // supported"); left out entirely when Google doesn't have one on file,
  // same pattern as movies' "No streaming options" fallback.
  websiteUrl: string | null;
  mapUrl: string | null;
}

const MAX_DETAIL_PHOTOS = 5;

export async function getRestaurantDetail(externalId: string): Promise<RestaurantDetail> {
  const res = await fetch(`${PLACES_BASE}/places/${externalId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": DETAIL_FIELD_MASK,
    },
  });
  if (!res.ok) {
    throw new Error(`Places detail request failed: ${res.status} ${await res.text()}`);
  }
  const place = (await res.json()) as PlacesDetailResponse;

  const photoUrls = (
    await Promise.all(
      (place.photos ?? []).slice(0, MAX_DETAIL_PHOTOS).map((p) => resolvePhotoUrl(p.name)),
    )
  ).filter((url): url is string => url !== null);

  return {
    title: place.displayName?.text ?? "Unnamed restaurant",
    imageUrl: photoUrls[0] ?? null,
    photos: photoUrls,
    cuisine: place.primaryTypeDisplayName?.text ?? null,
    rating: place.rating ?? null,
    priceLabel: place.priceLevel ? (PRICE_LABELS[place.priceLevel] ?? null) : null,
    address: place.formattedAddress ?? null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    websiteUrl: place.websiteUri ?? null,
    mapUrl: place.googleMapsUri ?? null,
  };
}

export type RestaurantLocation = { lat: number; lng: number } | { label: string };

// Nearby Search (New) has no pagination at all (hard cap of 20 results per
// call — see Google's docs), so later batches ("Show Me More") widen the
// search radius instead of paging, trading a bit of precision for genuinely
// new results. Capped at Places' own 50km radius ceiling.
const DEFAULT_RADIUS_M = 3000;
const MAX_RADIUS_M = 50000;

// Nearby Search (New)'s request body has no priceLevels/openNow fields at
// all (only includedTypes/excludedTypes narrow what it searches for) — so
// cuisine goes into the request itself, but price and open-now are applied
// here, after the fetch, against fields the field mask already pulls back
// for the card (rating/priceLevel/openNow). Text Search (New) does support
// both server-side, but filtering post-fetch for it too keeps one code path
// instead of two, and the result is identical either way.
function matchesPriceAndOpenNow(place: PlacesResult, filter: RestaurantFilter | null): boolean {
  if (!filter) return true;
  if (filter.price && !PRICE_SLUG_LEVELS[filter.price].includes(place.priceLevel ?? "")) {
    return false;
  }
  if (filter.openNow && place.currentOpeningHours?.openNow !== true) return false;
  return true;
}

// Text Search (New) does support real pagination via pageToken, but that
// token would need to be persisted across separate server-action calls
// (each batch request is its own stateless call) — out of scope for this
// MVP. Rotating the query phrasing per batch is a pragmatic stand-in: any
// restaurant it returns that's already in the session gets filtered out by
// generateCandidatePool's own dedup, same as a real "no new results" case.
const TEXT_QUERY_VARIANTS = [
  "restaurants",
  "top rated restaurants",
  "popular restaurants",
  "cafes and restaurants",
];

const RESULTS_PER_BATCH = 20;

export async function getRestaurantPool(
  location: RestaurantLocation,
  batchNumber: number,
  filter: RestaurantFilter | null = null,
): Promise<NormalizedItem[]> {
  const isCoords = "lat" in location;
  const cuisineType = filter?.cuisine ? CUISINE_PLACE_TYPES[filter.cuisine] : null;
  // The Distance tab's own choice takes priority as the starting radius;
  // "Show Me More" batches still widen it the same way as before, just from
  // whatever base the person actually asked for instead of always 3km.
  const baseRadiusM = filter?.distanceKm ? filter.distanceKm * 1000 : DEFAULT_RADIUS_M;

  const response = isCoords
    ? await placesSearch<PlacesSearchResponse>("/places:searchNearby", {
        includedTypes: [cuisineType ?? "restaurant"],
        maxResultCount: RESULTS_PER_BATCH,
        locationRestriction: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: Math.min(baseRadiusM * batchNumber, MAX_RADIUS_M),
          },
        },
        rankPreference: "POPULARITY",
      })
    : await placesSearch<PlacesSearchResponse>("/places:searchText", {
        textQuery: `${TEXT_QUERY_VARIANTS[(batchNumber - 1) % TEXT_QUERY_VARIANTS.length]} in ${location.label}`,
        pageSize: RESULTS_PER_BATCH,
        ...(cuisineType && { includedType: cuisineType }),
      });

  const places = (response.places ?? []).filter(
    (p) => p.displayName?.text && matchesPriceAndOpenNow(p, filter),
  );

  const imageUrls = await Promise.all(
    places.map((p) => (p.photos?.[0] ? resolvePhotoUrl(p.photos[0].name) : null)),
  );

  return places.map((p, i) =>
    normalizeRestaurant(
      p,
      imageUrls[i],
      isCoords && p.location
        ? haversineKm(location.lat, location.lng, p.location.latitude, p.location.longitude)
        : null,
    ),
  );
}
