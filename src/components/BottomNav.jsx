// Bottom tab bar with the camera in the middle. Capture and Scan are one tab: the camera stays lit
// while the captured photo is being scanned.
import { useApp } from '../state/AppContext';
import Icon from './Icon';

const TABS = [
  { id: 'realm', icon: 'map', label: 'Realm' },
  { id: 'ghost', icon: 'audio', label: 'Haunts' },
  { id: 'capture', icon: 'camera', label: 'Camera', center: true },
  { id: 'community', icon: 'users', label: 'Community' },
  { id: 'profile', icon: 'user', label: 'Me' },
];

export default function BottomNav() {
  const { route, navigate } = useApp();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ id, icon, label, center }) => {
        const active = route === id || (center && route === 'scan');
        return (
          <button key={id} className={`nav-tab ${center ? 'center' : ''} ${active ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={active ? 'page' : undefined} aria-label={label}>
            <span className="nav-icon"><Icon name={icon} /></span>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
