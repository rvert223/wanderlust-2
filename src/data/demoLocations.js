// Demo locations around Austin for presenting Wanderlust without walking anywhere. Each sits a
// short stroll from the sample sightings in data/seed.js, so the map, "near me", hazard alerts and
// photo GPS all have something to show. Pick one (or the walk) on the Profile tab.
export const DEMO_LOCATIONS = [
  { id: 'hacktx', name: 'HackTX · UT Austin', coords: { lat: 30.2862, lng: -97.7394 } },
  { id: 'driskill', name: 'The Driskill Hotel', coords: { lat: 30.2683, lng: -97.7406 } },
  { id: 'congress', name: 'Congress Avenue Bridge', coords: { lat: 30.2618, lng: -97.7449 } },
  { id: 'zilker', name: 'Zilker Botanical Garden', coords: { lat: 30.2672, lng: -97.7722 } },
  { id: 'barton-springs', name: 'Barton Springs Pool', coords: { lat: 30.2643, lng: -97.7705 } },
  { id: 'shoal-creek', name: 'Shoal Creek Trail', coords: { lat: 30.2818, lng: -97.7514 } },
  { id: 'greenbelt', name: 'Barton Creek Greenbelt', coords: { lat: 30.2599, lng: -97.7990 } },
];

// The "demo walk" visits these in order, then loops — one stop every DEMO_WALK_STEP_MS.
export const DEMO_WALK = ['hacktx', 'shoal-creek', 'driskill', 'congress', 'barton-springs', 'zilker', 'greenbelt'];
export const DEMO_WALK_STEP_MS = 20000;
