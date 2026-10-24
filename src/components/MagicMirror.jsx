// The enchanted mirror at the top of the Realm: shows the tagline, takes a search query
// ("ask the mirror") and reflects back the nearest matching sighting as a "vision".
import { sightingEmoji } from '../config/categories';
import { TAGLINE } from '../config/app';
import { formatDistance } from '../utils/geo';
import Icon from './Icon';

export default function MagicMirror({ query, onQuery, vision, onOpen }) {
  return (
    <section className="mirror">
      <div className="mirror-glass">
        <h1 className="mirror-title shimmer-text">Wanderlust</h1>
        <p className="mirror-tagline">
          {TAGLINE.split(' ').map((word, index) => (
            <span key={index} style={{ '--i': index }}>{word} </span>
          ))}
        </p>
        <label className="mirror-search">
          <Icon name="search" />
          <input
            className="mirror-input"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Ask the mirror… waterfall, ghost, hemlock"
            aria-label="Ask the mirror"
          />
        </label>
        {/* `key` replays the ripple animation whenever the reflected vision changes */}
        <button className="mirror-vision" key={vision?.id ?? 'none'} disabled={!vision} onClick={() => onOpen(vision)}>
          {vision ? (
            <>I see <b>{sightingEmoji(vision)} {vision.title}</b> · {formatDistance(vision.distanceKm)} away</>
          ) : (
            'The mirror clouds… nothing matches.'
          )}
        </button>
      </div>
    </section>
  );
}
