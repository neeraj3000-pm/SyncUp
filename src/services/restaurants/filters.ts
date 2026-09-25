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
] as const;

export const RESTAURANT_PRICES = [
  { value: "budget", label: "₹ Budget" },
  { value: "mid_range", label: "₹₹ Mid-range" },
  { value: "fine_dining", label: "₹₹₹ Fine Dining" },
] as const;

export const RESTAURANT_DISTANCES_KM = [2, 5, 10, 20] as const;

export type RestaurantCuisineSlug = (typeof RESTAURANT_CUISINES)[number]["value"];
export type RestaurantPriceSlug = (typeof RESTAURANT_PRICES)[number]["value"];

// Unlike MovieFilter, these are independent axes that combine freely
// ("Italian, Budget, Open Now"), so it's an object of optional fields.
export interface RestaurantFilter {
  cuisine: RestaurantCuisineSlug | null;
  price: RestaurantPriceSlug | null;
  openNow: boolean;
  // Only meaningful with coordinates — a typed area has no center to
  // measure from, so the picker hides it and text search ignores it.
  distanceKm: number | null;
}

export const EMPTY_RESTAURANT_FILTER: RestaurantFilter = {
  cuisine: null,
  price: null,
  openNow: false,
  distanceKm: null,
};

export function isEmptyRestaurantFilter(filter: RestaurantFilter): boolean {
  return (
    filter.cuisine === null &&
    filter.price === null &&
    !filter.openNow &&
    filter.distanceKm === null
  );
}
