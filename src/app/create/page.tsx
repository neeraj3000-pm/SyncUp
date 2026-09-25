"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredParticipantId, useGuestId } from "@/lib/guest";
import { createSessionAction } from "@/services/sessions/actions";
import {
  getLocationDetailAction,
  getLocationSuggestionsAction,
} from "@/services/location/actions";
import type { LocationSuggestion } from "@/services/location";
import { EatIcon, WatchIcon } from "@/components/icons/CategoryIcons";
import { track } from "@/lib/analytics";

const CATEGORIES = [
  { value: "WATCH", Icon: WatchIcon, label: "Watch", helper: "Movies and more" },
  { value: "EAT", Icon: EatIcon, label: "Eat", helper: "Restaurants and food" },
] as const;

const DURATIONS = [
  { value: 120, label: "2 min", helper: "Quick decision" },
  { value: 300, label: "5 min", helper: "Take your time" },
  { value: 600, label: "10 min", helper: "Explore a little" },
  // 0 is the "no limit" sentinel — translated to null server-side before
  // it reaches the database (createSessionAction).
  { value: 0, label: "No time limit", helper: "Swipe at your own pace" },
] as const;

export default function CreatePage() {
  return (
    <Suspense>
      <CreateForm />
    </Suspense>
  );
}

// Re-Sync (ResultsView) links here with ?category=WATCH pre-filled — one
// less tap when starting another round of the same category.
function CreateForm() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") === "EAT" ? "EAT" : "WATCH";

  const [category, setCategory] = useState<"WATCH" | "EAT">(initialCategory);
  const [duration, setDuration] = useState(300);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // EAT only — mutually exclusive with areaText, see the location section
  // below. Coordinates take priority when both happen to be set (shouldn't
  // normally happen since picking one clears the other).
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Which of the two ways to get coordinates set them — otherwise the "Use
  // my location" button can't tell its own GPS result apart from a picked
  // autocomplete suggestion, and would claim "using your current location"
  // for somewhere the person just typed.
  const [coordsSource, setCoordsSource] = useState<"gps" | "search" | null>(null);
  const [areaText, setAreaText] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // A session token groups the autocomplete keystrokes for one search
  // together with the Place Details call that follows a pick, so Google
  // bills the whole flow once instead of per request — null between
  // searches, generated on the first keystroke, discarded after a pick.
  // A ref, not state: it's read inside the effect/handlers below but never
  // drives a render, so there's nothing for React to re-render over.
  const sessionTokenRef = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const router = useRouter();

  const guestId = useGuestId();

  const needsLocation = category === "EAT" && !coords && !areaText.trim();

  // Debounced: fetches suggestions ~300ms after typing stops, not per
  // keystroke — coords already set (just picked a suggestion) means this is
  // the text catching up to that pick, not a fresh search, so it skips.
  useEffect(() => {
    // Every path that empties areaText or sets coords (onChange, the two
    // "Use my location" outcomes, a successful pick) already clears
    // suggestions itself at the source — nothing left for this branch to do
    // but bail out.
    if (!areaText.trim() || coords) return;

    const token = sessionTokenRef.current ?? crypto.randomUUID();
    sessionTokenRef.current = token;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await getLocationSuggestionsAction(areaText, token);
      if (cancelled) return;
      if (result.ok) {
        setSuggestions(result.data);
        setShowSuggestions(true);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [areaText, coords]);

  async function handlePickSuggestion(suggestion: LocationSuggestion) {
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestError(null);
    setResolvingPlaceId(suggestion.placeId);

    const token = sessionTokenRef.current ?? crypto.randomUUID();
    const result = await getLocationDetailAction(suggestion.placeId, token);
    setResolvingPlaceId(null);
    // The session ends at the pick regardless of outcome — a retry after a
    // failed resolve is a new search, not a continuation of this one.
    sessionTokenRef.current = null;

    if (!result.ok) {
      setSuggestError(result.error);
      return;
    }
    setCoords({ lat: result.data.lat, lng: result.data.lng });
    setCoordsSource("search");
    setAreaText(suggestion.text);
  }

  function handleUseMyLocation() {
    // Only ever called from this button tap — never on page load or when
    // switching to Eat — so the permission prompt fires only when the
    // person actually asks for it (PRD section 13).
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setCoordsSource("gps");
        setAreaText("");
        setGeoLoading(false);
      },
      () => {
        setGeoError("Couldn't get your location. Try entering an area instead.");
        setGeoLoading(false);
      },
      { timeout: 10000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !guestId || pending || needsLocation) return;

    setPending(true);
    setError(null);

    const result = await createSessionAction({
      category,
      durationSeconds: duration,
      creatorGuestId: guestId,
      displayName: trimmedName,
      locationLat: coords?.lat ?? null,
      locationLng: coords?.lng ?? null,
      locationLabel: areaText.trim() || null,
    });

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    track("session_created", {
      session_id: result.data.session.id,
      category,
      duration_seconds: duration,
      has_location: category === "EAT" ? Boolean(coords || areaText.trim()) : undefined,
    });
    setStoredParticipantId(result.data.session.id, result.data.participant.id);
    router.push(`/session/${result.data.session.id}`);
  }

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-10 overflow-y-auto overscroll-contain px-6 py-12">
      <h1 className="sr-only">Create a SyncUp</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground-muted">
          What are you deciding?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setCategory(c.value);
                track("category_selected", { category: c.value });
              }}
              aria-pressed={category === c.value}
              className={`flex items-center justify-between gap-3 rounded-card border p-4 text-left shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                category === c.value
                  ? "border-primary bg-surface-raised"
                  : "border-border bg-surface"
              }`}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">{c.label}</span>
                <span className="text-sm text-foreground-muted">{c.helper}</span>
              </span>
              <span
                className={`flex-shrink-0 ${category === c.value ? "text-primary" : "text-foreground-muted"}`}
              >
                <c.Icon className="h-9 w-9" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {category === "EAT" && (
        <section className="flex flex-col gap-4">
          <h2 id="location-heading" className="text-sm font-semibold text-foreground-muted">
            Where do you want to eat?
          </h2>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className={`w-full rounded-card border px-4 py-3 text-left font-semibold shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
              coordsSource === "gps" ? "border-primary bg-surface-raised" : "border-border bg-surface"
            }`}
          >
            {geoLoading
              ? "Getting your location…"
              : coordsSource === "gps"
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
              value={areaText}
              onChange={(e) => {
                const value = e.target.value;
                setAreaText(value);
                if (value) {
                  setCoords(null);
                  setCoordsSource(null);
                }
                if (!value.trim()) {
                  setSuggestions([]);
                  setShowSuggestions(false);
                  sessionTokenRef.current = null;
                }
              }}
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
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-autocomplete="list"
              aria-controls="location-suggestions"
              className="w-full rounded-card border border-border bg-surface px-4 py-3 text-lg shadow-card outline-none focus:border-primary"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id="location-suggestions"
                role="listbox"
                className="absolute z-10 mt-2 w-full overflow-hidden rounded-card border border-border bg-surface shadow-lg"
              >
                {suggestions.map((s) => (
                  <li key={s.placeId} role="option" aria-selected={false}>
                    <button
                      type="button"
                      // Fires before the input's onBlur, so the pick
                      // registers instead of the dropdown closing first.
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
          {resolvingPlaceId && (
            <p className="text-xs text-foreground-muted">Getting that location…</p>
          )}
          {suggestError && <p className="text-sm text-red-500">{suggestError}</p>}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground-muted">
          How long do you want to decide?
        </h2>
        <div className="flex flex-col gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => {
                setDuration(d.value);
                track("timer_selected", { duration_seconds: d.value });
              }}
              aria-pressed={duration === d.value}
              className={`flex items-center justify-between rounded-card border px-4 py-3 text-left shadow-card transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                duration === d.value
                  ? "border-primary bg-surface-raised"
                  : "border-border bg-surface"
              }`}
            >
              <span className="font-semibold">{d.label}</span>
              <span className="text-sm text-foreground-muted">{d.helper}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 id="name-heading" className="text-sm font-semibold text-foreground-muted">
          What&apos;s your name?
        </h2>
        <input
          autoComplete="name"
          enterKeyHint="done"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Neeraj"
          aria-labelledby="name-heading"
          className="rounded-card border border-border bg-surface px-4 py-3 text-lg shadow-card outline-none focus:border-primary"
        />
        <p className="text-xs text-foreground-muted">
          Shown to people you invite, e.g. &quot;{name.trim() || "Neeraj"} wants to
          decide {category === "WATCH" ? "what to watch" : "where to eat"}&quot;.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-2">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || pending || needsLocation}
          className="w-full rounded-pill bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-[background-color,transform,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:bg-border disabled:text-foreground-muted disabled:shadow-none"
        >
          {pending ? "Creating…" : "Create SyncUp"}
        </button>
      </form>
    </main>
  );
}
