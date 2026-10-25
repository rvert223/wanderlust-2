// App-wide constants and copy (tagline, safety text, ranks). No secrets here — see env.js.
export const TAGLINE = 'mirror, mirror on the wall, where to go to see it all?';

// Used until the browser grants geolocation (downtown Austin, TX).
export const DEFAULT_CENTER = { lat: 30.2672, lng: -97.7431 };

// "Scry radius" options on the map, in kilometres.
export const RADII = [
  { km: 25, label: 'Nearby' },
  { km: 250, label: 'Region' },
  { km: 2500, label: 'Country' },
  { km: 8000, label: 'World' },
];

// Hazard scale 0–5, worded as potions. A sighting at or above ALERT_HAZARD notifies nearby users.
export const HAZARD_LEVELS = ['Harmless', 'Mild Tonic', 'Wary Brew', 'Bitter Draught', 'Deadly Elixir', 'Draught of Doom'];
export const ALERT_HAZARD = 3;
export const ALERT_RADIUS_KM = 5;
export const DEMO_ALERT_DELAY_MS = 9000;

// The "Fear Frequency" detector (Hz and dB).
export const INFRASOUND = {
  targetHz: 18.9,
  bandHz: 1.5, // ± window highlighted as "the fear band" on the spectrum gauge
  maxHz: 40, // upper edge of the spectrum we display
  noiseFloorHz: [30, 60], // ambient noise floor = average of the bins in this range
  spikeDeltaDb: 12, // the 18.9 Hz bin must beat the noise floor by this much
  fftSize: 32768, // the AnalyserNode maximum: ~1.465 Hz per bin at 48 kHz
  testToneGain: 0.05, // test-tone level fed into the analyser
  cooldownMs: 12000, // minimum gap between Muse warnings
};

// Levels, earned from points (see profileService.pointsFor).
export const RANKS = [
  { name: 'Beginner', min: 0 },
  { name: 'Explorer', min: 50 },
  { name: 'Naturalist', min: 150 },
  { name: 'Expert', min: 400 },
];

export const DISCLAIMERS = [
  'AI identification can be wrong. Never touch, taste or smell an unknown plant or animal.',
  'This is not medical advice. If someone may have been poisoned, call Poison Control (US: 1-800-222-1222) or your local emergency number.',
  'Look-alikes are common — treat every wild mushroom, berry and snake as dangerous until a human expert confirms.',
];
