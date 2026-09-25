import "server-only";

// Shared by services/restaurants and services/location, which call
// different Places API (New) families but authenticate the same way.
export const PLACES_BASE = "https://places.googleapis.com/v1";

export function placesHeaders(fieldMask?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "",
    ...(fieldMask && { "X-Goog-FieldMask": fieldMask }),
  };
}
