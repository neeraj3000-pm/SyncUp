// The restaurant-pool filters (PRD section 13), shared by the picker UI, the
// server-side validation and the Google Places provider. Deliberately free
// of any server-only code so client components can import it too.

export const RESTAURANT_CUISINES = [
  { value: "indian", label: "Indian" },
  { value: "chinese", label: "Chinese" },
  { value: "italian", label: "Italian" },
  { value: "cafe", label: "Cafe" },
  { value: "fast_food", label: "Fast Food" },
  { value: "bakery", label: "Bakery & Desserts" },
  { value: "breweries_bars", label: "Breweries & Bars" },
] as const;

export const RESTAURANT_PRICES = [
  { value: "budget", label: "₹ Budget" },
  { value: "mid_range", label: "₹₹ Mid-range" },
  { value: "expensive", label: "₹₹₹ Expensive" },
  { value: "fine_dining", label: "₹₹₹₹ Fine Dining" },
] as const;

export const RESTAURANT_DISTANCES_KM = [2, 5, 10, 20] as const;

export type RestaurantCuisineSlug = (typeof RESTAURANT_CUISINES)[number]["value"];
export type RestaurantPriceSlug = (typeof RESTAURANT_PRICES)[number]["value"];

export interface RestaurantFilter {
  // A list, not a single value: someone choosing "Indian or Chinese" is a
  // normal thing to want, unlike price/distance where picking one bucket
  // is the natural model.
  cuisine: RestaurantCuisineSlug[];
  price: RestaurantPriceSlug | null;
  openNow: boolean;
  // Only meaningful with coordinates — a typed area has no center to
  // measure from, so the picker hides it and text search ignores it.
  distanceKm: number | null;
}

export const EMPTY_RESTAURANT_FILTER: RestaurantFilter = {
  cuisine: [],
  price: null,
  openNow: false,
  distanceKm: null,
};

export function isEmptyRestaurantFilter(filter: RestaurantFilter): boolean {
  return (
    filter.cuisine.length === 0 &&
    filter.price === null &&
    !filter.openNow &&
    filter.distanceKm === null
  );
}

const CUISINE_VALUES = RESTAURANT_CUISINES.map((o) => o.value);
const PRICE_VALUES = RESTAURANT_PRICES.map((o) => o.value);
const MAX_CUISINES = RESTAURANT_CUISINES.length;

function isOneOf<T>(value: unknown, allowed: readonly T[]): value is T {
  return (allowed as readonly unknown[]).includes(value);
}

// Shared by createSessionAction and the filter-count preview action — both
// take a client-submitted filter and need the exact same validation against
// the slugs/options this file defines.
export function normalizeRestaurantFilter(raw: unknown): RestaurantFilter | null | "invalid" {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return "invalid";
  const { cuisine, price, openNow, distanceKm } = raw as Record<string, unknown>;

  if (cuisine !== undefined) {
    if (!Array.isArray(cuisine) || cuisine.length > MAX_CUISINES) return "invalid";
    if (!cuisine.every((c) => isOneOf(c, CUISINE_VALUES))) return "invalid";
  }
  if (price !== null && price !== undefined && !isOneOf(price, PRICE_VALUES)) return "invalid";
  if (
    distanceKm !== null &&
    distanceKm !== undefined &&
    !isOneOf(distanceKm, RESTAURANT_DISTANCES_KM)
  ) {
    return "invalid";
  }
  if (openNow !== undefined && typeof openNow !== "boolean") return "invalid";

  const filter: RestaurantFilter = {
    // De-duplicated — a client could send the same slug twice.
    cuisine: Array.from(new Set((cuisine as RestaurantCuisineSlug[] | undefined) ?? [])),
    price: (price as RestaurantPriceSlug | null | undefined) ?? null,
    openNow: openNow === true,
    distanceKm: (distanceKm as number | undefined) ?? null,
  };
  // "No filter" is stored one way (null), never as an all-defaults object.
  return isEmptyRestaurantFilter(filter) ? null : filter;
}
