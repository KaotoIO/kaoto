import type { ThemeSetting } from '../types/theme';
import { getThemeFromCookies, setThemeInCookies } from './cookies';

/**
 * Theme settings return type
 */
interface ThemeSettings {
  themeSetting: ThemeSetting;
  headerInverse: boolean;
}

/** PatternFly switches its tokens to dark through this class on `<html>` */
const PATTERNFLY_DARK_CLASS = 'pf-v6-theme-dark';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Keep PatternFly's theme in line with the content theme.
 *
 * The canvas, its controls and the form come from `@kaoto/kaoto` and use PatternFly tokens, which do not react to
 * `data-theme-setting`. They all sit in the content area, so an inverted header does not matter here.
 */
function syncPatternFlyTheme(): void {
  const { themeSetting } = document.documentElement.dataset;
  const isDark =
    themeSetting === 'dark' || (themeSetting !== 'light' && globalThis.matchMedia(SYSTEM_DARK_QUERY).matches);

  document.documentElement.classList.toggle(PATTERNFLY_DARK_CLASS, isDark);
}

/**
 * Get current theme settings from cookies
 * @returns Object with themeSetting and headerInverse values
 */
export function getThemeSettings(): ThemeSettings {
  return getThemeFromCookies();
}

/**
 * Update theme setting and apply to HTML
 * @param themeSetting - Theme setting (system, light, dark)
 */
export function setThemeSetting(themeSetting: ThemeSetting): void {
  // Update cookie
  setThemeInCookies({ themeSetting });

  // Update HTML attribute immediately (no re-render needed)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.themeSetting = themeSetting;
    syncPatternFlyTheme();
  }
}

/**
 * Update header inverse setting and apply to HTML
 * @param headerInverse - Header inverse setting
 */
export function setHeaderInverse(headerInverse: boolean): void {
  // Update cookie
  setThemeInCookies({ headerInverse });

  // Update HTML attribute immediately (no re-render needed)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.headerInverse = String(headerInverse);
  }
}

/**
 * Initialize theme on page load (sync HTML attributes with cookies)
 * Call this once when the app starts
 * Only updates attributes if they're not already set by SSR
 */
export function initializeTheme(): void {
  if (typeof document === 'undefined') return;

  const { themeSetting, headerInverse } = getThemeSettings();

  // Get current attributes set by SSR
  const currentThemeSetting = document.documentElement.dataset.themeSetting;
  const currentHeaderInverse = document.documentElement.dataset.headerInverse;

  // Only update if attributes are missing OR if cookies have changed since SSR
  // This prevents hydration mismatch while allowing cookie updates to take effect
  if (!currentThemeSetting) {
    document.documentElement.dataset.themeSetting = themeSetting;
  } else if (currentThemeSetting !== themeSetting) {
    // Cookie changed between SSR and hydration - log warning but don't update
    // to avoid hydration mismatch. The next navigation will use the new value.
    console.warn('Theme cookie changed between SSR and hydration. ' + 'Change will take effect on next navigation.');
  }

  if (!currentHeaderInverse) {
    document.documentElement.dataset.headerInverse = String(headerInverse);
  } else if (currentHeaderInverse !== String(headerInverse)) {
    // Cookie changed between SSR and hydration - log warning but don't update
    console.warn(
      'Header inverse cookie changed between SSR and hydration. ' + 'Change will take effect on next navigation.',
    );
  }

  syncPatternFlyTheme();
  // The "system" setting follows the OS, also when it changes while the app is open
  globalThis.matchMedia(SYSTEM_DARK_QUERY).addEventListener('change', syncPatternFlyTheme);
}
