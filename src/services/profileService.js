// Profile service: persists the signed-in user, looks up other users, and derives
// gamification (points, alchemy rank, badges) plus the Muse-written potion bio.
import { RANKS } from '../config/app';
import { CONFIG, isConfigured } from '../config/env';
import { http } from '../connectors/_shared/http';
import { withFallback } from '../connectors/_shared/withFallback';
import { narrate } from '../connectors/muse';
import { DEFAULT_USER, SEED_USERS } from '../data/seed';
import { readJson, writeJson } from '../utils/storage';

const USER_KEY = 'wanderlust.user.v1';
const apiReady = () => isConfigured(CONFIG.api.baseUrl);

export const loadUser = () => readJson(USER_KEY, DEFAULT_USER);
export const saveUser = (user) => writeJson(USER_KEY, user);

export const getProfile = withFallback(
  'profile.get',
  apiReady,
  (id) => http.get(`${CONFIG.api.baseUrl}/users/${id}`),
  async (id) => SEED_USERS.find((user) => user.id === id),
);

export const pointsFor = ({ posted, helped, scanned }) => posted * 10 + helped * 15 + scanned * 5;

/** Current rank plus progress (0–1) toward the next one. */
export function rankFor(stats) {
  const points = pointsFor(stats);
  const index = RANKS.findLastIndex((rank) => points >= rank.min);
  const next = RANKS[index + 1];
  return { points, name: RANKS[index].name, next: next?.name, progress: next ? (points - RANKS[index].min) / (next.min - RANKS[index].min) : 1 };
}

const BADGES = [
  { id: 'scout', emoji: '🔍', label: 'First Scan', earned: (s) => s.scanned >= 1 },
  { id: 'herald', emoji: '📯', label: 'First Post', earned: (s) => s.posted >= 1 },
  { id: 'healer', emoji: '🧪', label: 'Helping Hand', earned: (s) => s.helped >= 1 },
  { id: 'sage', emoji: '🔮', label: 'Top Helper (50+ helped)', earned: (s) => s.helped >= 50 },
];
export const badgesFor = (stats) => BADGES.filter((badge) => badge.earned(stats));

/** Muse summarises the user's stats into a fun, potions-themed bio. */
export const getPotionBio = (user) => narrate('profile_bio', { name: user.name, stats: user.stats, rank: rankFor(user.stats).name });
