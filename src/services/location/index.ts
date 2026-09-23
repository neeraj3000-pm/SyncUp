import "server-only";

// PRD section 13/39: location handling stays behind its own provider layer,
// same as movies/restaurants — separate from services/restaurants because
// it's a genuinely different Places API family (Autocomplete + Place
// Details for resolving a typed search into coordinates, not Nearby/Text
// Search for finding restaurants once a location is known).
const PLACES_BASE = "https://places.googleapis.com/v1";

function apiKey(): string {
  return process.env.GOOGLE_PLACES_API_KEY ?? "";
}

export interface LocationSuggestion {
  placeId: string;
  text: string;
}

// Google bills Autocomplete requests together with the one Place Details
// call that follows a selection as a single "session" when they share a
// sessionToken — cheaper than billing every keystroke's request on its own.
// The client generates one token per distinct search (first keystroke after
// the field was empty) and discards it once a suggestion is picked or the
// field is abandoned, per Google's own session-token lifecycle guidance.
export async function getLocationSuggestions(
  input: string,
  sessionToken: string,
): Promise<LocationSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
    },
    body: JSON.stringify({
      input: trimmed,
      sessionToken,
      // The app is India-focused (JioHotstar/₹ pricing already assume this
      // market) — biasing suggestions to India cuts irrelevant results
      // rather than making the field technically restrict to it.
      includedRegionCodes: ["in"],
      languageCode: "en",
    }),
  });
  if (!res.ok) {
    throw new Error(`Places autocomplete failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[];
  };

  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text?: { text?: string } } => Boolean(p?.placeId))
    .map((p) => ({ placeId: p.placeId, text: p.text?.text ?? "" }))
    .filter((s) => s.text.length > 0);
}

export interface LocationDetail {
  lat: number;
  lng: number;
  label: string;
}

// Resolves a picked suggestion into real coordinates — this is what lets a
// typed area name drive the same precise, radius-based Nearby Search that
// "Use my location" already gets (services/restaurants), instead of the
// fuzzier free-text fallback that only kicks in when neither is available.
export async function getLocationDetail(
  placeId: string,
  sessionToken: string,
): Promise<LocationDetail | null> {
  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": "location,formattedAddress",
      },
    },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    location?: { latitude: number; longitude: number };
    formattedAddress?: string;
  };
  if (!data.location) return null;

  return {
    lat: data.location.latitude,
    lng: data.location.longitude,
    label: data.formattedAddress ?? "",
  };
}
