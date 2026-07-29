export interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_KEY = "divieight:geocode:v1";

function readCache(): Record<string, LatLng | null> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, LatLng | null>) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked — geocoding just won't be cached */
  }
}

/**
 * Geocodes "city, state zip" strings with OpenStreetMap Nominatim (free, no
 * key). Results are cached in localStorage and requests are serialized to
 * respect Nominatim's fair-use policy.
 */
export async function geocodePlaces(places: string[]): Promise<Record<string, LatLng>> {
  const cache = readCache();
  const out: Record<string, LatLng> = {};
  let dirty = false;

  for (const place of Array.from(new Set(places))) {
    if (place in cache) {
      const hit = cache[place];
      if (hit) out[place] = hit;
      continue;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(place)}`,
        { headers: { Accept: "application/json" } },
      );
      const json = (await res.json()) as Array<{ lat: string; lon: string }>;
      const first = json?.[0];
      const value = first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
      cache[place] = value;
      dirty = true;
      if (value) out[place] = value;
    } catch {
      cache[place] = null;
      dirty = true;
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  if (dirty) writeCache(cache);
  return out;
}
