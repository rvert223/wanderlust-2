// Location service: where the explorer is, from one of three sources.
//   'live'      the device GPS, followed continuously (connectors/location → watchLocation)
//   'walk'      the demo walk: steps through DEMO_WALK, one stop every DEMO_WALK_STEP_MS
//   <demo id>   a fixed demo location from data/demoLocations.js
// The chosen source is remembered per device.
// Place names: OpenStreetMap (real, via our server) first, then Facebook Graph, which itself falls
// back to the nearest sample landmark when it isn't set up.
import { DEMO_LOCATIONS, DEMO_WALK, DEMO_WALK_STEP_MS } from '../data/demoLocations';
import { placeAt } from '../connectors/facebookGraph';
import { watchLocation } from '../connectors/location';
import { placesReady, reversePlace } from '../connectors/places';
import { readJson, writeJson } from '../utils/storage';

const MODE_KEY = 'wanderlust.location-mode.v1';

const demoById = (id) => DEMO_LOCATIONS.find((point) => point.id === id);
const toReading = (point) => ({ coords: point.coords, approximate: false, demo: true, placeName: point.name });

export const loadLocationMode = () => {
  const mode = readJson(MODE_KEY, 'live');
  return mode === 'live' || mode === 'walk' || demoById(mode) ? mode : 'live';
};
export const saveLocationMode = (mode) => writeJson(MODE_KEY, mode);

/**
 * Starts reporting positions from `mode`. onPosition receives { coords, approximate, demo?, placeName? }
 * (demo positions carry their own place name). Returns a function that stops the source.
 */
export function startLocationSource(mode, onPosition) {
  if (mode === 'walk') {
    let step = 0;
    const next = () => {
      onPosition(toReading(demoById(DEMO_WALK[step % DEMO_WALK.length])));
      step += 1;
    };
    next();
    const timer = setInterval(next, DEMO_WALK_STEP_MS);
    return () => clearInterval(timer);
  }
  const point = demoById(mode);
  if (point) {
    onPosition(toReading(point));
    return () => {};
  }
  return watchLocation(onPosition);
}

/** The name of the place at these coordinates (see the order above). */
export async function placeNameAt(latitude, longitude) {
  if (placesReady()) {
    try {
      return await reversePlace(latitude, longitude);
    } catch (error) {
      console.warn('[places] OpenStreetMap lookup failed, trying Facebook / samples', error);
    }
  }
  return placeAt(latitude, longitude);
}
