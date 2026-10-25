// Real place names for GPS coordinates, from OpenStreetMap's Nominatim (free, no key).
// Called only from server/index.js (GET /api/place?lat=..&lng=..). Follows Nominatim's usage policy
// (https://operations.osmfoundation.org/policies/nominatim/): identifies the app in User-Agent,
// sends at most one request per second across all visitors, and caches answers.
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'Wanderlust/1.0 (HackTX 2026 field-guide app)';
const MIN_GAP_MS = 1100; // Nominatim allows 1 request/second
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const TIMEOUT_MS = 8000;

const cache = new Map(); // "lat,lng" rounded to ~100 m -> { name, at }
let queue = Promise.resolve();
let lastCall = 0;

function apiError(message, status = 502) {
  return Object.assign(new Error(message), { status, expose: true });
}

/** Waits its turn so calls to Nominatim are at least MIN_GAP_MS apart. */
function nextSlot() {
  const slot = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCall = Date.now();
  });
  queue = slot.catch(() => {});
  return slot;
}

/** The most useful short name: a landmark if there is one, else neighbourhood and city. */
function placeName(data) {
  const a = data.address || {};
  const landmark = a.tourism || a.leisure || a.amenity || a.attraction || a.university || a.park || a.building || data.name;
  const area = a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.road;
  const city = a.city || a.town || a.village || a.municipality || a.county;
  return landmark || [area, city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',').trim() || null;
}

/** GET /api/place?lat=..&lng=.. → { name } */
export async function reverse(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw apiError('Send lat and lng as numbers', 400);
  }
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { name: hit.name };

  await nextSlot();
  const url = new URL(NOMINATIM_URL);
  url.search = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lng), zoom: '17', addressdetails: '1' });
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw apiError(`OpenStreetMap answered ${response.status}`);
  const data = await response.json();
  const name = data.error ? null : placeName(data);
  if (!name) throw apiError('No place name for this spot', 404);

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { name, at: Date.now() });
  return { name };
}
