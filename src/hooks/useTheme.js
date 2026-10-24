// Dark / light mode. Starts from the saved choice, else the system preference, then applies it
// as <html data-theme="..."> (the CSS tokens in styles/theme.css react to that attribute).
import { useLayoutEffect, useState } from 'react';
import { readJson, writeJson } from '../utils/storage';

const STORAGE_KEY = 'wanderlust.theme.v1';
const BROWSER_BAR_COLORS = { dark: '#241812', light: '#ece3cf' };

const initialTheme = () => readJson(STORAGE_KEY, null) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  // Layout effect = applied before the first paint, so there is no wrong-theme flash.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_BAR_COLORS[theme]);
    writeJson(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')) };
}
