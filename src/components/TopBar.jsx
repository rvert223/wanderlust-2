// Header: theme toggle on the left, the user's avatar (opens Me) on the right.
import { useApp } from '../state/AppContext';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';

export default function TopBar() {
  const { user, navigate } = useApp();
  return (
    <header className="top-bar">
      <div className="top-row">
        <ThemeToggle />
        <button className="top-avatar" onClick={() => navigate('profile')} aria-label="My profile">
          <Avatar name={user.name} photo={user.photo} size={36} />
        </button>
      </div>
    </header>
  );
}
