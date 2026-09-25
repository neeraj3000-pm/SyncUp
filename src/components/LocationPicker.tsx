"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLocationDetailAction,
  getLocationSuggestionsAction,
} from "@/services/location/actions";
import type { LocationSuggestion } from "@/services/location";

export interface LocationValue {
  // Set by "Use my location" (gps) or by picking a suggestion (search).
  coords: { lat: number; lng: number } | null;
  source: "gps" | "search" | null;
  // Free text typed into the area field — used on its own (text search)
  // only when no suggestion was picked.
  label: string;
}

export const EMPTY_LOCATION: LocationValue = { coords: null, source: null, label: "" };

const SUGGEST_DEBOUNCE_MS = 300;

// PRD section 13: where to eat, asked only after Eat is chosen. Two ways in:
// device location, or typing an area (with autocomplete that resolves a
// pick into real coordinates).
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  // Groups one search's autocomplete requests with the Place Details call
  // that follows a pick, so Google bills the whole flow once. Created on
  // the first keystroke of a search, discarded after a pick.
  const sessionTokenRef = useRef<string | null>(null);

  // Debounced suggestions. With coords already set, the text is just
  // echoing a pick (or GPS is in use), so there's nothing to search.
  useEffect(() => {
    if (!value.label.trim() || value.coords) return;

    const token = (sessionTokenRef.current ??= crypto.randomUUID());
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await getLocationSuggestionsAction(value.label, token);
      if (cancelled || !result.ok) return;
      setSuggestions(result.data);
      setShowSuggestions(true);
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value.label, value.coords]);

  function handleTyping(text: string) {
    // Any edit invalidates coordinates from an earlier GPS fix or pick.
    onChange({ coords: null, source: null, label: text });
    if (!text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      sessionTokenRef.current = null;
    }
  }

  async function handlePickSuggestion(suggestion: LocationSuggestion) {
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestError(null);
    setResolving(true);

    const token = sessionTokenRef.current ?? crypto.randomUUID();
    const result = await getLocationDetailAction(suggestion.placeId, token);
    setResolving(false);
    // The billing session ends at the pick either way — a retry is a new search.
    sessionTokenRef.current = null;

    if (!result.ok) {
      setSuggestError(result.error);
      return;
    }
    onChange({
      coords: { lat: result.data.lat, lng: result.data.lng },
      source: "search",
      label: suggestion.text,
    });
  }

  // Only ever called from the button — never on load — so the permission
  // prompt appears only when someone actually asks for it.
  function handleUseMyLocation() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Location isn't available in this browser. Try entering an area instead.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
          source: "gps",
          label: "",
        });
        setSuggestions([]);
        setGeoLoading(false);
      },
      () => {
        setGeoError("Couldn't get your location. Try entering an area instead.");
        setGeoLoading(false);
      },
      { timeout: 10000 },
    );
  }

  const usingGps = value.source === "gps";
  const listboxOpen = showSuggestions && suggestions.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <h2 id="location-heading" className="text-sm font-semibold text-foreground-muted">
        Where do you want to eat?
      </h2>
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={geoLoading}
        className={`w-full rounded-card border px-4 py-3 text-left font-semibold shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
          usingGps ? "border-primary bg-surface-raised" : "border-border bg-surface"
        }`}
      >
        {geoLoading
          ? "Getting your location…"
          : usingGps
            ? "✓ Using your current location"
            : "📍 Use my location"}
      </button>
      {geoError && <p className="text-sm text-red-500">{geoError}</p>}
      <div className="flex items-center gap-3 text-xs text-foreground-muted">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="relative">
        <input
          value={value.label}
          onChange={(e) => handleTyping(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => setShowSuggestions(false)}
          placeholder="Choose an area, e.g. Indiranagar, Bangalore"
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-labelledby="location-heading"
          aria-expanded={listboxOpen}
          aria-autocomplete="list"
          aria-controls="location-suggestions"
          className="w-full rounded-card border border-border bg-surface px-4 py-3 text-lg shadow-card outline-none focus:border-primary"
        />
        {listboxOpen && (
          <ul
            id="location-suggestions"
            role="listbox"
            className="absolute z-10 mt-2 w-full overflow-hidden rounded-card border border-border bg-surface shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s.placeId} role="option" aria-selected={false}>
                <button
                  type="button"
                  // Keeps the input from blurring (and closing this list)
                  // before the click registers.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePickSuggestion(s)}
                  className="block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-surface-raised"
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {resolving && <p className="text-xs text-foreground-muted">Getting that location…</p>}
      {suggestError && <p className="text-sm text-red-500">{suggestError}</p>}
    </section>
  );
}
