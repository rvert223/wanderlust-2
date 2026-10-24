// Field-guide header: wordmark, theme toggle, the user's avatar (opens Me) and the current location.
import { useApp } from '../state/AppContext';
import Avatar from './Avatar';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

export default function TopBar() {
  const { location, user, navigate } = useApp();
  const { lat } = location.coords;
  return (
    <header className="top-bar">
      <div className="top-row">
        <span className="top-btn plain" aria-hidden="true"><Icon name="book" /></span>
        <span className="top-brand">Wanderlust</span>
        <button className="top-avatar" onClick={() => navigate('profile')} aria-label="My profile">
          <Avatar emoji={user.emoji} size={34} />
        </button>
        <ThemeToggle />
      </div>
      <p className="top-location mono">
        <Icon name="target" /> {location.placeName} · {Math.abs(lat).toFixed(2)}° {lat >= 0 ? 'N' : 'S'}
      </p>
    </header>
  );
}
