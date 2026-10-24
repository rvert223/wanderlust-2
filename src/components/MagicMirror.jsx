// The Realm's header: title and sighting count, then the "ask the mirror" search.
import Icon from './Icon';

export default function MagicMirror({ query, onQuery, count }) {
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
    </section>
  );
}
