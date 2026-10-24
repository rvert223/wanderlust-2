// Demo data used by the mocks (offline mode). Replace with your backend's data in production.
// Everything is centred on Austin, TX, plus two far-away wonders to show the "World" radius.
import { offsetCoords } from '../utils/geo';
import { asReporter } from '../utils/people';

const verified = (...agree) => ({ status: 'verified', aiScore: 0.93, votes: agree.map((userId) => ({ userId, agree: true })) });
const pending = (aiScore) => ({ status: 'pending', aiScore, votes: [] });

export const SEED_USERS = [
  {
    id: 'lena', name: 'Lena Okafor', handle: '@mushroomwitch', emoji: '🧙‍♀️', verified: true,
    title: 'Mycologist of Zilker', topics: ['flora'], home: { lat: 30.2669, lng: -97.7729 },
    background: 'Field mycologist with 12 years leading foraging walks. Volunteers with the Texas Mycological Society.',
    stats: { posted: 84, helped: 212, scanned: 301 },
  },
  {
    id: 'tomas', name: 'Tomás Reyes', handle: '@fernwhisperer', emoji: '🧝', verified: true,
    title: 'Botanist of Shoal Creek', topics: ['flora', 'wonder'], home: { lat: 30.2823, lng: -97.7509 },
    background: 'UT Austin botany grad student cataloguing invasive and toxic plants along urban creeks.',
    stats: { posted: 61, helped: 134, scanned: 190 },
  },
  {
    id: 'priya', name: 'Priya Raman', handle: '@serpentsage', emoji: '🐍', verified: true,
    title: 'Herpetologist of Barton Creek', topics: ['fauna'], home: { lat: 30.2594, lng: -98.0001 },
    background: 'Wildlife rehabilitator and snake-ID volunteer; has safely relocated 400+ snakes.',
    stats: { posted: 47, helped: 98, scanned: 150 },
  },
  {
    id: 'gus', name: 'Gus Holloway', handle: '@lanternkeeper', emoji: '🕯️', verified: true,
    title: 'Paranormal Investigator', topics: ['ghost', 'sound'], home: { lat: 30.2685, lng: -97.7403 },
    background: 'Runs Austin’s longest-standing ghost tour and records infrasound at historic sites.',
    stats: { posted: 120, helped: 76, scanned: 22 },
  },
  {
    id: 'mira', name: 'Mira Chen', handle: '@aurorawitch', emoji: '🌌', verified: true,
    title: 'Aurora Chaser', topics: ['wonder'], home: { lat: 64.8378, lng: -147.7164 },
    background: 'Astronomer in Fairbanks who forecasts geomagnetic storms for amateur sky-watchers.',
    stats: { posted: 203, helped: 310, scanned: 12 },
  },
];

/** The signed-in wanderer (replace with your auth/user service). */
export const DEFAULT_USER = {
  id: 'me', name: 'Explorer', handle: '@you', emoji: '👸', verified: false,
  title: 'New explorer', topics: [], home: null,
  background: '',
  stats: { posted: 0, helped: 0, scanned: 0 },
};

// `hoursAgo` is converted to a real timestamp when the store is first seeded.
export const SEED_SIGHTINGS = [
  { id: 's1', category: 'wonder', emoji: '💧', title: 'Hamilton Pool waterfall', place: 'Hamilton Pool Preserve', description: 'A 50-foot waterfall pouring into a collapsed grotto, mist glowing at golden hour.', coords: { lat: 30.3423, lng: -98.1272 }, hazard: 0, reporterId: 'tomas', hoursAgo: 30, verification: verified('lena', 'tomas') },
  { id: 's2', category: 'wonder', emoji: '🌫️', title: 'Glowing mist over the springs', place: 'Barton Springs Pool', description: 'Cold spring water steaming into the dawn air, lit pink by the sunrise.', coords: { lat: 30.2640, lng: -97.7710 }, hazard: 0, reporterId: 'lena', hoursAgo: 9, verification: verified('tomas', 'gus') },
  { id: 's3', category: 'fauna', emoji: '🦇', title: 'Million-bat evening flight', place: 'Congress Avenue Bridge', description: 'The largest urban bat colony in North America spirals out at dusk.', coords: { lat: 30.2613, lng: -97.7451 }, hazard: 1, reporterId: 'priya', hoursAgo: 4, verification: verified('priya', 'lena') },
  { id: 's4', category: 'ghost', emoji: '🕯️', title: 'Cold spot on the second floor', place: 'The Driskill Hotel', description: 'Guests report a sudden chill and a low hum near the old ballroom corridor.', coords: { lat: 30.2685, lng: -97.7403 }, hazard: 0, reporterId: 'gus', hoursAgo: 52, verification: verified('gus', 'tomas') },
  { id: 's5', category: 'ghost', emoji: '⚰️', title: 'Wandering lantern light', place: 'Oakwood Cemetery', description: 'A pale light drifting between the oldest headstones after midnight.', coords: { lat: 30.2698, lng: -97.7295 }, hazard: 0, reporterId: 'gus', hoursAgo: 75, verification: verified('gus', 'lena') },
  { id: 's6', category: 'sound', emoji: '🔔', title: 'The groaning granite', place: 'Enchanted Rock', description: 'The dome creaks and groans at night as the cooling rock contracts.', coords: { lat: 30.5063, lng: -98.8190 }, hazard: 0, reporterId: 'tomas', hoursAgo: 120, verification: verified('tomas', 'gus') },
  { id: 's7', category: 'flora', emoji: '🍄', title: 'Pale mushrooms by the oak', place: 'Zilker Botanical Garden', description: 'Ghost-white caps with a skirt on the stem, growing in a fairy ring.', coords: { lat: 30.2669, lng: -97.7729 }, hazard: 5, reporterId: 'lena', hoursAgo: 3, verification: pending(0.88) },
  { id: 's8', category: 'flora', emoji: '🌿', title: 'Lacy white blooms, purple-spotted stems', place: 'Shoal Creek Trail', description: 'Head-high umbrella blooms along the trail — looks like wild carrot, but the stem is blotched.', coords: { lat: 30.2823, lng: -97.7509 }, hazard: 4, reporterId: 'tomas', hoursAgo: 14, verification: verified('tomas', 'lena') },
  { id: 's9', category: 'flora', emoji: '🌱', title: 'Spiky red seed pods', place: 'East Austin lot', description: 'Star-shaped leaves with spiny red pods, growing wild by a fence.', coords: { lat: 30.2411, lng: -97.7213 }, hazard: 4, reporterId: 'lena', hoursAgo: 20, verification: pending(0.81) },
  { id: 's10', category: 'fauna', emoji: '🐍', title: 'Red-yellow-black banded snake', place: 'Barton Creek Greenbelt', description: 'Slim banded snake under a limestone ledge; red touching yellow.', coords: { lat: 30.2594, lng: -97.8001 }, hazard: 4, reporterId: 'priya', hoursAgo: 6, verification: verified('priya', 'tomas') },
  { id: 's11', category: 'flora', emoji: '🌸', title: 'Trumpet flowers & spiky pods', place: 'Walnut Creek Metro Park', description: 'White trumpet blooms opening at dusk, followed by thorny egg-shaped capsules.', coords: { lat: 30.3090, lng: -97.6900 }, hazard: 3, reporterId: 'tomas', hoursAgo: 40, verification: pending(0.72) },
  { id: 's12', category: 'wonder', emoji: '🏜️', title: 'Canyon sunset fire', place: 'Grand Canyon South Rim', description: 'Layers of rock glowing orange then violet as the sun sinks.', coords: { lat: 36.1069, lng: -112.1129 }, hazard: 0, reporterId: 'mira', hoursAgo: 200, verification: verified('mira', 'tomas') },
  { id: 's13', category: 'wonder', emoji: '🌌', title: 'Green-violet aurora curtains', place: 'Fairbanks, Alaska', description: 'Kp-6 storm painting dancing curtains of aurora across the whole sky.', coords: { lat: 64.8378, lng: -147.7164 }, hazard: 0, reporterId: 'mira', hoursAgo: 11, verification: verified('mira', 'gus') },
];

/** Turns `hoursAgo` into a timestamp and `reporterId` into the reporter stub the UI shows. */
export const buildSeedSightings = (now = Date.now()) =>
  SEED_SIGHTINGS.map(({ hoursAgo, reporterId, ...rest }) => ({
    ...rest,
    reporter: asReporter(SEED_USERS.find((user) => user.id === reporterId)),
    createdAt: now - hoursAgo * 3600000,
  }));

/** A "just posted by someone else" hazard used by the alert simulator (offline demo only). */
export const demoIncomingSighting = (center) => ({
  id: `s_incoming_${Date.now()}`, category: 'flora', emoji: '🌿', hazard: 4, reporter: asReporter(SEED_USERS[0]),
  title: 'Water hemlock by the creek', place: 'Nearby creek bank', createdAt: Date.now(),
  description: 'Clusters of white umbrella flowers on hollow stems — extremely toxic look-alike of wild celery.',
  coords: offsetCoords(center, 0.9, 0.7), verification: pending(0.79),
});
