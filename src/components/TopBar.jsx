// Field-guide header: book mark, theme toggle and the user's avatar (opens Me), the current
// location in mono caps, and a segmented control for the three main sections.
import { useApp } from '../state/AppContext';
import Avatar from './Avatar';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

const SEGMENTS = [
  { id: 'realm', label: 'Realm' },
  { id: 'capture', label: 'Capture' },
  { id: 'scan', label: 'Scan' },
];

export default function TopBar() {
  const { route, location, user, navigate } = useApp();
  const { lat } = location.coords;
  return (
    <header className="top-bar">
      <div className="top-row">
        <span className="top-mark" aria-hidden="true"><Icon name="book" /></span>
        <ThemeToggle />
        <button className="top-avatar" onClick={() => navigate('profile')} aria-label="My profile">
          <Avatar emoji={user.emoji} size={38} />
        </button>
      </div>
      <p className="top-location mono">
        <Icon name="target" /> {location.placeName} · {Math.abs(lat).toFixed(2)}° {lat >= 0 ? 'N' : 'S'}
      </p>
      <nav className="segmented" aria-label="Sections">
        {SEGMENTS.map(({ id, label }) => (
          <button key={id} className={`segment ${route === id ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={route === id ? 'page' : undefined}>
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
