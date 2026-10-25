// Single source of truth for every API endpoint, key and tunable.
// Values come from `.env` (see .env.example). Anything that still starts with
// "YOUR_" is treated as "not configured yet" and its connector uses a mock instead.
const env = import.meta.env;

/** Reads VITE_<NAME>, falling back to an explicit default or a YOUR_<NAME> placeholder. */
const read = (name, fallback) => env[`VITE_${name}`] || fallback || `YOUR_${name}`;

/** True once a placeholder has been replaced with a real value. */
export const isConfigured = (value) => Boolean(value) && !String(value).startsWith('YOUR_');

export const CONFIG = {
  // Wanderlust's own backend. Unset => sightings live in localStorage.
  api: {
    baseUrl: read('API_BASE_URL'),
    alertsWsUrl: read('ALERTS_WS_URL'),
  },
  // SerpAPI Google Lens, reached through our own server (server/index.js), which keeps the key.
  serpapi: {
    lensUrl: read('SERPAPI_LENS_URL', '/api/serp/lens'),
  },
  // Meta Muse (Muse Spark + Voice Transcribe), reached through our own server (server/muse.js),
  // which holds the Meta Model API key. These are routes on this site, not Meta URLs.
  muse: {
    scanUrl: read('MUSE_SCAN_URL', '/api/muse/scan'),
    narrateUrl: read('MUSE_NARRATE_URL', '/api/muse/narrate'),
    transcribeUrl: read('MUSE_TRANSCRIBE_URL', '/api/muse/transcribe'),
  },
  // Facebook Graph API: place lookup and nearby community-verified experts.
  facebook: {
    accessToken: read('FACEBOOK_ACCESS_TOKEN'),
    baseUrl: read('FACEBOOK_BASE_URL', 'https://graph.facebook.com/v22.0'),
    nearbyExpertsPath: read('FACEBOOK_NEARBY_EXPERTS_PATH'),
  },
  // Optional Python (scipy/librosa) service that double-checks infrasound spikes.
  infrasound: {
    backendUrl: read('INFRASOUND_BACKEND_URL'),
  },
  // When no camera exists (desktop dev), allow a clearly-flagged, unverifiable demo frame.
  allowDemoCapture: env.VITE_ALLOW_DEMO_CAPTURE !== 'false',
};
