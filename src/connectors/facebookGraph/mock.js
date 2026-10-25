// Offline stand-in for the Graph API, backed by the seed community in data/seed.js.
import { SEED_SIGHTINGS, SEED_USERS } from '../../data/seed';
import { distanceKm } from '../../utils/geo';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Name of the nearest seeded landmark (or a generic glade if nothing is close). */
export async function placeAtMock(latitude, longitude) {
  await wait(300);
  const coords = { lat: latitude, lng: longitude };
  const nearest = SEED_SIGHTINGS.map((s) => ({ s, km: distanceKm(coords, s.coords) })).sort((a, b) => a.km - b.km)[0];
  return nearest.km < 3 ? nearest.s.place : 'Uncharted Glade';
}

/** Verified experts whose home is within 150 km, nearest first, optionally matching the topic. */
export async function findNearbyExpertsMock(latitude, longitude, specimenName, topic) {
  await wait(400);
  const coords = { lat: latitude, lng: longitude };
  return SEED_USERS.filter((user) => user.verified)
    .map((user) => ({ ...user, distanceKm: distanceKm(coords, user.home) }))
    .filter((user) => user.distanceKm < 150 && (!topic || user.topics.includes(topic)))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function requestVerificationMock() {
  await wait(500);
  return { requested: true };
}
