import "server-only";
import { PLACES_BASE, placesHeaders } from "@/services/google-places";
import type { NormalizedItem } from "@/services/movies";
import type {
  RestaurantCuisineSlug,
  RestaurantFilter,
  RestaurantPriceSlug,
} from "@/services/restaurants/filters";

// PRD section 39: restaurant content flows through a provider abstraction,
// never called directly from the UI. Google Places API (New) is the
// provider (CLAUDE.md — chosen during scoping).

// Rating/price/opening-hours fields put every search call under Places'
// "Enterprise" SKU tier rather than the cheaper "Essentials" one — worth
// knowing since Enterprise's free monthly allowance is smaller (1,000/month
// vs. 10,000), but the PRD's restaurant card (section 23) needs all three,
// so there's no cheaper field selection that still meets scope.
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.location",
  "places.photos",
  "places.currentOpeningHours.openNow",
  "places.rating",
  "places.priceLevel",
].join(",");

interface PlacesLatLng {
  latitude: number;
  longitude: number;
}

interface PlacesResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  primaryType?: string;
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
    headers: placesHeaders(SEARCH_FIELD_MASK),
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
      { headers: placesHeaders() },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch {
    // A missing/broken photo shouldn't take down the whole pool — the card
    // already has a fallback for a null image_url.
    return null;
  }
}

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "₹",
  PRICE_LEVEL_MODERATE: "₹₹",
  PRICE_LEVEL_EXPENSIVE: "₹₹₹",
  PRICE_LEVEL_VERY_EXPENSIVE: "₹₹₹₹",
};

// Matched against a place's PRIMARY type (not just "any of its types") —
// precise enough that a hotel's restaurant can still match "Indian" while a
// hotel itself doesn't just because it also happens to serve coffee. A few
// close neighbors per cuisine keep that stricter match from thinning results
// out. Places has no North/South Indian split, so "indian_restaurant" covers
// both; there's no "brewery" type either, so Breweries & Bars uses the two
// closest real ones.
const CUISINE_PLACE_TYPES: Record<RestaurantCuisineSlug, readonly string[]> = {
  // Google splits this into its own regional types, distinct from the
  // generic "indian_restaurant" — missing them was quietly excluding a
  // large share of real Indian restaurants from this filter.
  indian: ["indian_restaurant", "north_indian_restaurant", "south_indian_restaurant"],
  chinese: ["chinese_restaurant"],
  italian: ["italian_restaurant", "pizza_restaurant"],
  cafe: ["cafe", "coffee_shop"],
  fast_food: ["fast_food_restaurant", "hamburger_restaurant", "sandwich_shop"],
  bakery: ["bakery", "dessert_shop", "dessert_restaurant", "ice_cream_shop"],
  breweries_bars: ["bar", "brewery", "brewpub", "wine_bar"],
};

// Places' priceLevel enum maps one-to-one onto the picker's 4 buckets.
const PRICE_SLUG_LEVELS: Record<RestaurantPriceSlug, string> = {
  budget: "PRICE_LEVEL_INEXPENSIVE",
  mid_range: "PRICE_LEVEL_MODERATE",
  expensive: "PRICE_LEVEL_EXPENSIVE",
  fine_dining: "PRICE_LEVEL_VERY_EXPENSIVE",
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
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(externalId)}`, {
    headers: placesHeaders(DETAIL_FIELD_MASK),
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
// all (only includedTypes narrows what it searches for), and Text Search
// (New) only takes a single includedType — useless once more than one
// cuisine is selected. So cuisine narrows the Nearby Search request itself
// (a real win: Places does the filtering), but price, open-now, and
// multi-cuisine Text Search are all applied here, after the fetch, against
// fields the field mask already pulls back for the card.
function matchesFilter(place: PlacesResult, filter: RestaurantFilter | null): boolean {
  if (!filter) return true;
  if (filter.cuisine.length > 0) {
    const allowedTypes = filter.cuisine.flatMap((c) => CUISINE_PLACE_TYPES[c]);
    if (!place.primaryType || !allowedTypes.includes(place.primaryType)) return false;
  }
  if (filter.price && place.priceLevel !== PRICE_SLUG_LEVELS[filter.price]) return false;
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

// The actual Places call + post-filter, shared by getRestaurantPool (which
// goes on to resolve a photo per result) and previewRestaurantCount (which
// only needs how many matched, so it skips that entirely — the expensive
// part of a real pool generation).
async function searchAndFilter(
  location: RestaurantLocation,
  batchNumber: number,
  filter: RestaurantFilter | null,
): Promise<PlacesResult[]> {
  const isCoords = "lat" in location;
  const cuisineTypes = filter?.cuisine.length
    ? Array.from(new Set(filter.cuisine.flatMap((c) => CUISINE_PLACE_TYPES[c])))
    : null;
  // The Distance tab's own choice takes priority as the starting radius;
  // "Show Me More" batches still widen it the same way as before, just from
  // whatever base the person actually asked for instead of always 3km.
  const baseRadiusM = filter?.distanceKm ? filter.distanceKm * 1000 : DEFAULT_RADIUS_M;

  const response = isCoords
    ? await placesSearch<PlacesSearchResponse>("/places:searchNearby", {
        // Unfiltered, any place of type "restaurant" qualifies, which also
        // covers every specific cuisine type. includedPrimaryTypes takes an
        // array natively, so every selected cuisine narrows this one call.
        ...(cuisineTypes
          ? { includedPrimaryTypes: cuisineTypes }
          : { includedTypes: ["restaurant"] }),
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
      });

  return (response.places ?? []).filter((p) => p.displayName?.text && matchesFilter(p, filter));
}

export async function getRestaurantPool(
  location: RestaurantLocation,
  batchNumber: number,
  filter: RestaurantFilter | null = null,
): Promise<NormalizedItem[]> {
  const isCoords = "lat" in location;
  const places = await searchAndFilter(location, batchNumber, filter);

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

// Lets the host see roughly how many restaurants a filter combination
// matches before starting the session — narrow filters (several cuisines
// plus Open Now plus a tight radius) can otherwise leave almost nothing to
// swipe on. Only ever reads the first batch (same as what the session will
// actually open with) and skips photo resolution, so this is cheap enough
// to call on every filter change.
export async function previewRestaurantCount(
  location: RestaurantLocation,
  filter: RestaurantFilter | null,
): Promise<number> {
  const places = await searchAndFilter(location, 1, filter);
  return places.length;
}
