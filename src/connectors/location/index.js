// Location connector — wraps the browser Geolocation API (no key; the browser asks the user).
//  getCurrentPosition()            : one reading, or the default centre (flagged `approximate`)
//  watchLocation(onChange)         : keeps reporting the position as the device moves; returns stop()
import { DEFAULT_CENTER, LOCATION } from '../../config/app';

const FALLBACK = { coords: DEFAULT_CENTER, approximate: true };
const toReading = ({ coords }) => ({ coords: { lat: coords.latitude, lng: coords.longitude }, approximate: false, accuracyM: coords.accuracy });

export function getCurrentPosition(timeout = 8000) {
  if (!navigator.geolocation) return Promise.resolve(FALLBACK);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toReading(position)),
      () => resolve(FALLBACK),
      { enableHighAccuracy: true, timeout },
    ),
  );
}

/**
 * Calls onChange(reading) on every position update. If location is denied or unavailable it
 * reports the default centre once (approximate). Returns a function that stops watching.
 */
export function watchLocation(onChange) {
  if (!navigator.geolocation) {
    onChange(FALLBACK);
    return () => {};
  }
  let hasFix = false;
  const id = navigator.geolocation.watchPosition(
    (position) => {
      hasFix = true;
      onChange(toReading(position));
    },
    () => {
      if (!hasFix) onChange(FALLBACK);
    },
    { enableHighAccuracy: true, maximumAge: LOCATION.gpsMaxAgeMs, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
