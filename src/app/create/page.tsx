"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredParticipantId, useGuestId } from "@/lib/guest";
import { buttonPrimary } from "@/lib/ui";
import { createSessionAction } from "@/services/sessions/actions";
import type { SessionCategory } from "@/services/sessions";
import type { MovieFilter } from "@/services/movies/filters";
import type { RestaurantFilter } from "@/services/restaurants/filters";
import { EatIcon, WatchIcon } from "@/components/icons/CategoryIcons";
import { EMPTY_LOCATION, LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { MovieFilterPicker } from "@/components/MovieFilterPicker";
import { RestaurantFilterPicker } from "@/components/RestaurantFilterPicker";

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

  const [category, setCategory] = useState<SessionCategory>(initialCategory);
  const [movieFilter, setMovieFilter] = useState<MovieFilter | null>(null);
  const [restaurantFilter, setRestaurantFilter] = useState<RestaurantFilter | null>(null);
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [duration, setDuration] = useState(300);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const guestId = useGuestId();

  const needsLocation = category === "EAT" && !location.coords && !location.label.trim();

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
      locationLat: location.coords?.lat ?? null,
      locationLng: location.coords?.lng ?? null,
      locationLabel: location.label.trim() || null,
      movieFilter: category === "WATCH" ? movieFilter : null,
      restaurantFilter: category === "EAT" ? restaurantFilter : null,
    });

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    setStoredParticipantId(result.data.session.id, result.data.participant.id);
    router.push(`/session/${result.data.session.id}`);
  }

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col">
      <h1 className="sr-only">Create a SyncUp!</h1>
      {/* The fields scroll in here; "Create SyncUp!" is a sibling outside
          this region, so it's always on screen. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-12">
        <div className="flex flex-col gap-10 pb-6">
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground-muted">
              What are you deciding?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
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

          {category === "WATCH" && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground-muted">What do you want to watch?</h2>
              <MovieFilterPicker value={movieFilter} onChange={setMovieFilter} />
            </section>
          )}

          {category === "EAT" && <LocationPicker value={location} onChange={setLocation} />}

          {category === "EAT" && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground-muted">What do you want to eat?</h2>
              <RestaurantFilterPicker
                value={restaurantFilter}
                onChange={setRestaurantFilter}
                hasCoords={location.coords !== null}
              />
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
                  onClick={() => setDuration(d.value)}
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
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 border-t border-border bg-background px-6 pb-6 pt-4"
      >
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || pending || needsLocation}
          className={`w-full ${buttonPrimary}`}
        >
          {pending ? "Creating…" : "Create SyncUp!"}
        </button>
      </form>
    </main>
  );
}
