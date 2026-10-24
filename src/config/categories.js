// Sighting categories: one place that defines label, emoji, line icon and colour for the whole UI.
// Colours are mid-tones so they stay readable in both dark and light mode.
export const CATEGORIES = {
  wonder: { label: 'Natural Wonders', emoji: '🌈', icon: 'mountain', color: '#6d9fc4' },
  ghost: { label: 'Haunted Places', emoji: '👻', icon: 'ghost', color: '#8a74b8' },
  sound: { label: 'Rare Sounds', emoji: '🔔', icon: 'bell', color: '#c9962b' },
  flora: { label: 'Potion Plants', emoji: '🍄', icon: 'leaf', color: '#3f7a5c' },
  fauna: { label: 'Creatures', emoji: '🦇', icon: 'paw', color: '#b0485c' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** A sighting's own emoji, or its category's default. */
export const sightingEmoji = (sighting) => sighting.emoji || CATEGORIES[sighting.category].emoji;
