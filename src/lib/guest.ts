// No accounts in the MVP (PRD section 43). Each browser gets a locally-stored
// id the app uses to recognize the same participant across a session — it is
// not a verified identity, just a client-side convenience.
const STORAGE_KEY = "syncup_guest_id";

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateGuestId can only run in the browser");
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
