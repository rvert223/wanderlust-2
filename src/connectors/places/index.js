// Places connector — real place names for GPS coordinates, from OpenStreetMap via our own server
// (server/places.js, GET /api/place). Throws when the server can't answer; the location service
// then falls back to Facebook Graph / the sample landmarks.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';

export const placesReady = () => isConfigured(CONFIG.places.url);

/** reversePlace(latitude, longitude) -> "Zilker Botanical Garden" | "Hyde Park, Austin" | … */
export async function reversePlace(latitude, longitude) {
  const { name } = await http.get(CONFIG.places.url, { query: { lat: latitude.toFixed(5), lng: longitude.toFixed(5) }, timeoutMs: 12000 });
  if (!name) throw new Error('no place name');
  return name;
}
