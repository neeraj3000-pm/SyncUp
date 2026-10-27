import "server-only";
import { PLACES_BASE, placesHeaders } from "@/services/google-places";

// Places Autocomplete + Details: turns a typed area into coordinates.

export interface LocationSuggestion {
  placeId: string;
  text: string;
}

// Sharing a sessionToken bills all the keystrokes plus the final Details
// call as one session instead of per request. The client makes one token
// per search.
export async function getLocationSuggestions(
  input: string,
  sessionToken: string,
): Promise<LocationSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: placesHeaders(),
    body: JSON.stringify({
      input: trimmed,
      sessionToken,
      // The app is India-focused (₹ pricing, Indian streaming services).
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

// Coordinates let a picked area use radius-based Nearby Search, same as
// "Use my location".
export async function getLocationDetail(
  placeId: string,
  sessionToken: string,
): Promise<LocationDetail | null> {
  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: placesHeaders("location,formattedAddress") },
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
