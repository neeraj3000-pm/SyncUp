"use client";

import { FilterChip, FilterPicker, type FilterTab } from "@/components/FilterPicker";
import {
  EMPTY_RESTAURANT_FILTER,
  RESTAURANT_CUISINES,
  RESTAURANT_DISTANCES_KM,
  RESTAURANT_PRICES,
  isEmptyRestaurantFilter,
  type RestaurantFilter,
} from "@/services/restaurants/filters";

// Unlike movies, these combine freely — a cuisine, a price, a distance and
// Open Now can all be active at once. Tapping a selected chip clears just
// that one field.
export function RestaurantFilterPicker({
  value,
  onChange,
  hasCoords,
}: {
  value: RestaurantFilter | null;
  onChange: (filter: RestaurantFilter | null) => void;
  // Distance only means something relative to a coordinate center, so its
  // tab appears once "Use my location" or a picked suggestion set one.
  hasCoords: boolean;
}) {
  const current = value ?? EMPTY_RESTAURANT_FILTER;

  function update(partial: Partial<RestaurantFilter>) {
    const next = { ...current, ...partial };
    onChange(isEmptyRestaurantFilter(next) ? null : next);
  }

  const tabs: FilterTab[] = [
    {
      value: "cuisine",
      label: "Cuisine",
      chips: RESTAURANT_CUISINES.map(({ value: cuisine, label }) => ({
        key: cuisine,
        label,
        selected: current.cuisine === cuisine,
        onToggle: () => update({ cuisine: current.cuisine === cuisine ? null : cuisine }),
      })),
    },
    {
      value: "price",
      label: "Price",
      chips: RESTAURANT_PRICES.map(({ value: price, label }) => ({
        key: price,
        label,
        selected: current.price === price,
        onToggle: () => update({ price: current.price === price ? null : price }),
      })),
    },
  ];
  if (hasCoords) {
    tabs.push({
      value: "distance",
      label: "Distance",
      chips: RESTAURANT_DISTANCES_KM.map((km) => ({
        key: String(km),
        label: `Within ${km} km`,
        selected: current.distanceKm === km,
        onToggle: () => update({ distanceKm: current.distanceKm === km ? null : km }),
      })),
    });
  }

  return (
    <FilterPicker
      allLabel="All Restaurants"
      isAll={value === null}
      onSelectAll={() => onChange(null)}
      tabs={tabs}
      // Standalone rather than a tab: an on/off toggle isn't a list of
      // options, and it applies whichever tab is open.
      extra={
        <FilterChip
          selected={current.openNow}
          onClick={() => update({ openNow: !current.openNow })}
          className="w-fit"
        >
          Open Now
        </FilterChip>
      }
    />
  );
}
