"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredParticipantId, useGuestId } from "@/lib/guest";
import { createSessionAction } from "@/services/sessions/actions";

const CATEGORIES = [
  { value: "WATCH", emoji: "🎬", label: "Watch", helper: "Movies and more" },
  { value: "EAT", emoji: "🍔", label: "Eat", helper: "Restaurants and food" },
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
  const [areaText, setAreaText] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const router = useRouter();

  const guestId = useGuestId();

  const needsLocation = category === "EAT" && !coords && !areaText.trim();

  function handleUseMyLocation() {
    // Only ever called from this button tap — never on page load or when
    // switching to Eat — so the permission prompt fires only when the
    // person actually asks for it (PRD section 13).
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
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

    setStoredParticipantId(result.data.session.id, result.data.participant.id);
    router.push(`/session/${result.data.session.id}`);
  }

  return (
    <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-10 overflow-y-auto overscroll-contain px-6 py-12">
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
              className={`flex flex-col items-start gap-1 rounded-card border p-4 text-left transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
                category === c.value
                  ? "border-primary bg-surface-raised"
                  : "border-border bg-surface"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="font-semibold">{c.label}</span>
              <span className="text-sm text-foreground-muted">{c.helper}</span>
            </button>
          ))}
        </div>
      </section>

      {category === "EAT" && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground-muted">
            Where do you want to eat?
          </h2>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className={`w-full rounded-card border px-4 py-3 text-left font-semibold transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 ${
              coords ? "border-primary bg-surface-raised" : "border-border bg-surface"
            }`}
          >
            {geoLoading
              ? "Getting your location…"
              : coords
                ? "✓ Using your current location"
                : "📍 Use my location"}
          </button>
          {geoError && <p className="text-sm text-red-500">{geoError}</p>}
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>
          <input
            value={areaText}
            onChange={(e) => {
              setAreaText(e.target.value);
              if (e.target.value) setCoords(null);
            }}
            placeholder="Choose an area, e.g. Indiranagar, Bangalore"
            maxLength={100}
            autoComplete="off"
            enterKeyHint="search"
            className="rounded-card border border-border bg-surface px-4 py-3 text-lg outline-none focus:border-primary"
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
              className={`flex items-center justify-between rounded-card border px-4 py-3 text-left transition-[background-color,border-color,transform,scale] duration-150 ease-out active:scale-[0.97] ${
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
        <h2 className="text-sm font-semibold text-foreground-muted">
          What&apos;s your name?
        </h2>
        <input
          autoComplete="name"
          enterKeyHint="done"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Neeraj"
          className="rounded-card border border-border bg-surface px-4 py-3 text-lg outline-none focus:border-primary"
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
