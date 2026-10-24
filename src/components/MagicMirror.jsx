// The Realm's header: title, tagline and sighting count, then the "ask the mirror" search that
// reflects back the nearest matching sighting as a "vision".
import { sightingEmoji } from '../config/categories';
import { TAGLINE } from '../config/app';
import { formatDistance } from '../utils/geo';
import Icon from './Icon';

export default function MagicMirror({ query, onQuery, vision, onOpen, count }) {
  return (
    <section className="mirror">
      <header className="mirror-head">
        <div>
          <h1 className="mirror-title">Wanderlust</h1>
          <p className="mirror-tagline mono">{TAGLINE}</p>
        </div>
        <span className="count-pill"><i className="dot" /> {count} Sighting{count === 1 ? '' : 's'}</span>
      </header>
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
      {/* `key` replays the reveal animation whenever the reflected vision changes */}
      <button className="mirror-vision" key={vision?.id ?? 'none'} disabled={!vision} onClick={() => onOpen(vision)}>
        {vision ? (
          <>I see <b>{sightingEmoji(vision)} {vision.title}</b> · {formatDistance(vision.distanceKm)} away</>
        ) : (
          'The mirror clouds… nothing matches.'
        )}
      </button>
    </section>
  );
}
