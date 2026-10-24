// Sighting categories: one place that defines label, emoji, line icon and colour for the whole UI.
// Colours are mid-tones so they stay readable in both dark and light mode.
export const CATEGORIES = {
  wonder: { label: 'Natural Wonders', emoji: '🌈', icon: 'mountain', color: '#3fa7c4' },
  ghost: { label: 'Haunted Places', emoji: '👻', icon: 'ghost', color: '#8b74d6' },
  sound: { label: 'Rare Sounds', emoji: '🔔', icon: 'bell', color: '#c9962b' },
  flora: { label: 'Potion Plants', emoji: '🍄', icon: 'leaf', color: '#3fae83' },
  fauna: { label: 'Creatures', emoji: '🦇', icon: 'paw', color: '#d46aa6' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** A sighting's own emoji, or its category's default. */
export const sightingEmoji = (sighting) => sighting.emoji || CATEGORIES[sighting.category].emoji;
