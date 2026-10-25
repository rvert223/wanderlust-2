// Alert service: tells the user when a hazardous sighting appears nearby.
// Real mode: listens on a WebSocket (VITE_ALERTS_WS_URL) that pushes new sightings as JSON.
// Offline mode: simulates one incoming hazard shortly after launch so the flow can be demoed — once per
// visit, even though the subscription restarts every time the explorer moves.
import { ALERT_HAZARD, DEMO_ALERT_DELAY_MS } from '../config/app';
import { CONFIG, isConfigured } from '../config/env';
import { demoIncomingSighting } from '../data/seed';
import { distanceKm } from '../utils/geo';

let demoAlertShown = false;

/** Calls onAlert(sighting) for hazards within radiusKm of `center`. Returns an unsubscribe fn. */
export function subscribeToAlerts({ center, radiusKm, onAlert }) {
  const accept = (sighting) => {
    if (sighting.hazard >= ALERT_HAZARD && distanceKm(center, sighting.coords) <= radiusKm) onAlert(sighting);
  };

  if (isConfigured(CONFIG.api.alertsWsUrl)) {
    const socket = new WebSocket(CONFIG.api.alertsWsUrl);
    socket.onmessage = (event) => accept(JSON.parse(event.data));
    return () => socket.close();
  }

  if (demoAlertShown) return () => {};
  const timer = setTimeout(() => {
    demoAlertShown = true;
    accept(demoIncomingSighting(center));
  }, DEMO_ALERT_DELAY_MS);
  return () => clearTimeout(timer);
}
