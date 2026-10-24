// Bottom tab bar for the secondary sections (the main three live in the top bar's segmented control).
import { useApp } from '../state/AppContext';
import Icon from './Icon';

const TABS = [
  { id: 'community', icon: 'users', label: 'Circle' },
  { id: 'ghost', icon: 'audio', label: 'Haunts' },
  { id: 'profile', icon: 'notebook', label: 'Me' },
];

export default function BottomNav() {
  const { route, navigate } = useApp();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ id, icon, label }) => {
        const active = route === id;
        return (
          <button key={id} className={`nav-tab ${active ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={active ? 'page' : undefined}>
            <span className="nav-icon"><Icon name={icon} /></span>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
