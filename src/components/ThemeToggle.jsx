// Round sun/moon button in the top bar that switches between dark and light mode.
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="top-btn theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
