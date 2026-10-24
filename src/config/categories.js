// Sighting categories: one place that defines label, emoji, line icon and colour for the whole UI.
// Colours are mid-tones so they stay readable in both dark and light mode.
export const CATEGORIES = {
  wonder: { label: 'Natural Wonders', emoji: '🌈', icon: 'mountain', color: '#5f8fa3' },
  ghost: { label: 'Haunted Places', emoji: '👻', icon: 'ghost', color: '#8171a6' },
  sound: { label: 'Rare Sounds', emoji: '🔔', icon: 'bell', color: '#a88d66' },
  flora: { label: 'Potion Plants', emoji: '🍄', icon: 'leaf', color: '#527a68' },
  fauna: { label: 'Creatures', emoji: '🦇', icon: 'paw', color: '#a0607a' },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

/** A sighting's own emoji, or its category's default. */
export const sightingEmoji = (sighting) => sighting.emoji || CATEGORIES[sighting.category].emoji;
