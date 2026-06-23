// Temporary, session-scoped memory of the last location the user searched on the
// "find beans" (map) page, so "what's nearby" can reuse it. sessionStorage clears
// when the tab/browser closes, which is the "temporary" behavior we want.
export type SavedLocation = {
  lat: number;
  lng: number;
  zip: string;
  displayName?: string;
};

const STORAGE_KEY = "mapahead_last_location";

export function saveLastLocation(location: SavedLocation): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Best-effort; ignore storage/serialization errors.
  }
}

export function readLastLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLocation>;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.zip === "string"
    ) {
      return parsed as SavedLocation;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLastLocation(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
