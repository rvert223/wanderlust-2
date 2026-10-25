// Offline stand-in for the Google Lens bridge: "sees" one of the demo specimens and returns
// Lens-shaped matches pointing at real, stable reference sites.
import { DEMO_SPECIMENS } from '../../data/specimens';
import { consolidateLens } from './lens';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

export async function visualSearchMock() {
  await wait(1200);
  const { name, scientificName, summary } = pickRandom(DEMO_SPECIMENS);
  return consolidateLens({
    suggested_titles: [name, scientificName],
    visual_matches: [
      { title: `${name} (${scientificName})`, source: 'iNaturalist', link: 'https://www.inaturalist.org/', snippet: summary },
      { title: `${name} — identification and look-alikes`, source: 'Poison Control', link: 'https://www.poison.org/articles/plants' },
      { title: `${scientificName} field guide`, source: 'Texas Parks & Wildlife', link: 'https://tpwd.texas.gov/huntwild/wild/species/' },
    ],
  });
}
