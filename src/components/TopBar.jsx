// Field-guide header: theme toggle, the user's avatar (opens Me) and the current location in mono caps.
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
        <ThemeToggle />
        <p className="top-location mono">
          <Icon name="target" /> {location.placeName} · {Math.abs(lat).toFixed(2)}° {lat >= 0 ? 'N' : 'S'}
        </p>
        <button className="top-avatar" onClick={() => navigate('profile')} aria-label="My profile">
          <Avatar name={user.name} size={36} />
        </button>
      </div>
    </header>
  );
}
