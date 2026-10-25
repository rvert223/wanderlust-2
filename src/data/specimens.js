// Demo specimens used by the offline fallbacks of the scan pipeline (SerpAPI Lens mock + Muse mock).
// Delete or extend freely — the real pipeline never reads this file.
export const DEMO_SPECIMENS = [
  {
    name: 'Destroying Angel', scientificName: 'Amanita bisporigera', category: 'flora', hazard: 5, confidence: 0.91, emoji: '🍄',
    summary: 'A pure-white woodland mushroom with a skirt-like ring and a bulbous, cup-wrapped base.',
    dangers: 'Contains amatoxins. A single cap can cause irreversible liver failure; symptoms are delayed by 6–24 hours.',
    lookalikes: ['Meadow mushroom', 'Young puffball', 'Button mushroom'],
  },
  {
    name: 'Poison Hemlock', scientificName: 'Conium maculatum', category: 'flora', hazard: 4, confidence: 0.87, emoji: '🌿',
    summary: 'A tall, hollow-stemmed biennial with purple-blotched stalks and lacy umbrella-shaped white blooms.',
    dangers: 'Every part is toxic. Coniine paralyses the respiratory system; even skin contact with sap can irritate.',
    lookalikes: ['Wild carrot (Queen Anne’s lace)', 'Wild parsnip', 'Fennel'],
  },
  {
    name: 'Castor Bean Plant', scientificName: 'Ricinus communis', category: 'flora', hazard: 4, confidence: 0.89, emoji: '🌱',
    summary: 'Star-shaped glossy leaves and spiny red seed pods that rattle when ripe.',
    dangers: 'Seeds hold ricin; chewing even a few can be fatal to children and pets.',
    lookalikes: ['Cannabis (leaf shape)', 'Hibiscus'],
  },
  {
    name: 'Jimsonweed', scientificName: 'Datura stramonium', category: 'flora', hazard: 3, confidence: 0.84, emoji: '🌸',
    summary: 'Trumpet-shaped white flowers and a spiky, egg-sized seed capsule.',
    dangers: 'Tropane alkaloids cause delirium, fever and a racing heart. Toxic to touch-then-eat, and to livestock.',
    lookalikes: ['Morning glory', 'Angel’s trumpet'],
  },
  {
    name: 'Texas Coral Snake', scientificName: 'Micrurus tener', category: 'fauna', hazard: 4, confidence: 0.82, emoji: '🐍',
    summary: 'A slim, shy snake ringed in red, yellow and black — "red touches yellow, kill a fellow".',
    dangers: 'Neurotoxic venom; bites are rare but need immediate medical care even if symptoms seem mild.',
    lookalikes: ['Scarlet kingsnake', 'Milk snake'],
  },
];
