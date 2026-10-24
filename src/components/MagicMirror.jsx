// The Realm's header: title and sighting count, then the "ask the mirror" search that
// reflects back the nearest matching sighting as a "vision".
import { formatDistance } from '../utils/geo';
import Icon from './Icon';

export default function MagicMirror({ query, onQuery, vision, onOpen, count }) {
  return (
    <section className="mirror">
      <header className="mirror-head">
        <h1 className="mirror-title">Wanderlust</h1>
        <span className="count-pill"><i className="dot" /> {count} Sighting{count === 1 ? '' : 's'}</span>
      </header>
      <label className="mirror-search">
        <Icon name="search" />
        <input
          className="mirror-input"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search"
          aria-label="Ask the mirror"
        />
      </label>
      {/* `key` replays the reveal animation whenever the reflected vision changes */}
      <button className="mirror-vision" key={vision?.id ?? 'none'} disabled={!vision} onClick={() => onOpen(vision)}>
        {vision ? (
          <>I see <b>{vision.title}</b> · {formatDistance(vision.distanceKm)} away</>
        ) : (
          'The mirror clouds… nothing matches.'
        )}
      </button>
    </section>
  );
}
