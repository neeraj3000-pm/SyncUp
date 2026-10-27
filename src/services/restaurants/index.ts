import "server-only";
import { PLACES_BASE, placesHeaders } from "@/services/google-places";
import type { NormalizedItem } from "@/services/movies";
import type {
  RestaurantCuisineSlug,
  RestaurantFilter,
  RestaurantPriceSlug,
} from "@/services/restaurants/filters";

// Google Places API (New), server-side only.

// Rating/price/opening hours put every search in Places' pricier
// "Enterprise" SKU (1,000 free/month vs 10,000), but the restaurant card
// needs all three.
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

// The default photo endpoint redirects with our API key in the URL;
// skipHttpRedirect returns a keyless googleusercontent.com URL instead,
// safe to hand to the browser.
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
    // A broken photo falls back to the card's placeholder.
    return null;
  }
}

const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "₹",
  PRICE_LEVEL_MODERATE: "₹₹",
  PRICE_LEVEL_EXPENSIVE: "₹₹₹",
  PRICE_LEVEL_VERY_EXPENSIVE: "₹₹₹₹",
};

// Matched against a place's primary type only, so a hotel that serves
// coffee isn't a "Cafe". Close neighbours per cuisine keep that strict
// match from thinning results out.
const CUISINE_PLACE_TYPES: Record<RestaurantCuisineSlug, readonly string[]> = {
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

// Detail sheet only: extra photos, website and map link aren't worth
// fetching for every candidate in the pool.
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
  // Places has no "order online" link; the restaurant's website is the
  // closest equivalent.
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

// Nearby Search has no pagination (20 results max), so "Show Me More"
// batches widen the radius instead, up to Places' 50km ceiling.
const DEFAULT_RADIUS_M = 3000;
const MAX_RADIUS_M = 50000;

// Nearby Search can only narrow by type, and Text Search takes a single
// type, so price, open-now and multi-cuisine text searches are filtered
// here after the fetch.
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

// Text Search's pageToken would have to be stored between batches;
// rotating the phrasing instead surfaces new places, and repeats are
// deduped by generateCandidatePool.
const TEXT_QUERY_VARIANTS = [
  "restaurants",
  "top rated restaurants",
  "popular restaurants",
  "cafes and restaurants",
];

const RESULTS_PER_BATCH = 20;

async function searchAndFilter(
  location: RestaurantLocation,
  batchNumber: number,
  filter: RestaurantFilter | null,
): Promise<PlacesResult[]> {
  const isCoords = "lat" in location;
  const cuisineTypes = filter?.cuisine.length
    ? Array.from(new Set(filter.cuisine.flatMap((c) => CUISINE_PLACE_TYPES[c])))
    : null;
  const baseRadiusM = filter?.distanceKm ? filter.distanceKm * 1000 : DEFAULT_RADIUS_M;

  const response = isCoords
    ? await placesSearch<PlacesSearchResponse>("/places:searchNearby", {
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

// How many places the first batch would hold with these filters, shown
// before starting so narrow filters don't leave nothing to swipe. Skips
// photo lookups, the expensive part.
export async function previewRestaurantCount(
  location: RestaurantLocation,
  filter: RestaurantFilter | null,
): Promise<number> {
  const places = await searchAndFilter(location, 1, filter);
  return places.length;
}
