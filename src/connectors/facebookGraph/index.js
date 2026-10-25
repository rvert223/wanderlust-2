// Facebook Graph API connector — "the village".
//  placeAt(latitude, longitude)                          : nearest landmark / park name, so every post
//                                                          is grouped by place
//  findNearbyExperts(latitude, longitude, specimenName, category?) : community-verified people near a
//                                                          point who know the specimen (your own endpoint)
//  requestVerification({ sighting, expert })             : pings an expert to confirm a sighting
// Note: Meta only serves /pages/search to apps approved for "Page Public Metadata Access". Without
// that approval (or without a token) the call fails and the seeded mock answers instead.
import { CONFIG, isConfigured } from '../../config/env';
import { http } from '../_shared/http';
import { withFallback } from '../_shared/withFallback';
import { findNearbyExpertsMock, placeAtMock, requestVerificationMock } from './mock';

const ready = () => isConfigured(CONFIG.facebook.accessToken);
const query = (extra) => ({ access_token: CONFIG.facebook.accessToken, ...extra });
const graph = (path) => `${CONFIG.facebook.baseUrl}${path}`;
// The experts endpoint is your own server: a full URL, or a path on the Graph base URL.
const expertsUrl = () => (/^https?:\/\//.test(CONFIG.facebook.nearbyExpertsPath) ? CONFIG.facebook.nearbyExpertsPath : graph(CONFIG.facebook.nearbyExpertsPath));

const PLACE_SEARCH_RADIUS_M = 1000;

export const placeAt = withFallback(
  'graph-place',
  ready,
  async (latitude, longitude) => {
    const result = await http.get(graph('/pages/search'), {
      query: query({ type: 'place', center: `${latitude},${longitude}`, distance: PLACE_SEARCH_RADIUS_M, fields: 'name,location', limit: 1 }),
    });
    const name = result.data?.[0]?.name;
    if (!name) throw new Error('no place found near this point');
    return name;
  },
  placeAtMock,
);

/** Normalises the endpoint's answer into [{ id, name, distanceKm? }] — it may return plain Facebook user IDs. */
const toExperts = (data = []) =>
  data.map((entry) => (typeof entry === 'string' ? { id: entry, name: 'Verified explorer' } : { name: 'Verified explorer', ...entry }));

export const findNearbyExperts = withFallback(
  'graph-experts',
  () => ready() && isConfigured(CONFIG.facebook.nearbyExpertsPath),
  async (latitude, longitude, targetSpecimenName, category) => {
    const result = await http.post(expertsUrl(), { latitude, longitude, specimen: targetSpecimenName, category }, { query: query() });
    return toExperts(result.data ?? result.experts ?? result.user_ids);
  },
  findNearbyExpertsMock,
);

export const requestVerification = withFallback(
  'graph-verify',
  () => ready() && isConfigured(CONFIG.facebook.nearbyExpertsPath),
  ({ sighting, expert }) => http.post(graph(`/${expert.id}/verification_requests`), { sightingId: sighting.id }, { query: query() }),
  requestVerificationMock,
);
