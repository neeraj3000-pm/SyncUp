"use client";

import { FilterPicker, type FilterTab } from "@/components/FilterPicker";
import { MOVIE_FILTER_OPTIONS, type MovieFilter } from "@/services/movies/filters";

const TABS: { kind: MovieFilter["kind"]; label: string }[] = [
  { kind: "genre", label: "Genre" },
  { kind: "discover", label: "Discover" },
  { kind: "language", label: "Language" },
];

// Single-select across all tabs: each kind is a different way of asking
// TMDB for a list, so picking one replaces any other. Tapping the selected
// chip again clears back to "All Movies".
export function MovieFilterPicker({
  value,
  onChange,
}: {
  value: MovieFilter | null;
  onChange: (filter: MovieFilter | null) => void;
}) {
  const tabs: FilterTab[] = TABS.map(({ kind, label }) => ({
    value: kind,
    label,
    chips: MOVIE_FILTER_OPTIONS[kind].map((option) => {
      const selected = value?.kind === kind && value.value === option.value;
      return {
        key: option.value,
        label: option.label,
        selected,
        onToggle: () => onChange(selected ? null : ({ kind, value: option.value } as MovieFilter)),
      };
    }),
  }));

  return (
    <FilterPicker
      allLabel="All Movies"
      isAll={value === null}
      onSelectAll={() => onChange(null)}
      tabs={tabs}
    />
  );
}
