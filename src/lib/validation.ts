const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server Actions are reachable by direct POST, so ids from the client are
// checked at the boundary instead of being passed straight to the database.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 90;
}

export function isLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 180;
}

const MAX_LOCATION_LABEL_LENGTH = 100;

// A free-text area ("Indiranagar, Bangalore"), trimmed and capped; null if empty.
export function normalizeLocationLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, MAX_LOCATION_LABEL_LENGTH) || null;
}
