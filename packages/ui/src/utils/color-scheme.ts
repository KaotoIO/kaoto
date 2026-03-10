import { ColorScheme } from '../models';

export const DARK_MODE_PATTERN_FLY_CLASS_NAME = 'pf-v6-theme-dark';
export const DARK_MODE_CARBON_ATTR_NAME = 'data-theme-setting';

export const setColorScheme = (scheme: ColorScheme): void => {
  const html = document.querySelector('html');
  if (!html) return;

  let colorScheme = scheme;
  if (scheme === ColorScheme.Auto) {
    colorScheme = getSystemColorScheme();
  }

  if (colorScheme === ColorScheme.Light) {
    html.classList.remove(DARK_MODE_PATTERN_FLY_CLASS_NAME);
    html.setAttribute(DARK_MODE_CARBON_ATTR_NAME, 'light');
  } else {
    html.classList.add(DARK_MODE_PATTERN_FLY_CLASS_NAME);
    html.setAttribute(DARK_MODE_CARBON_ATTR_NAME, 'dark');
  }
};

const getSystemColorScheme = (): ColorScheme.Dark | ColorScheme.Light => {
  if (!globalThis.matchMedia) return ColorScheme.Light;
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? ColorScheme.Dark : ColorScheme.Light;
};

export const isDarkModeEnabled = (): boolean => {
  const html = document.querySelector('html');
  if (!html) return false;

  return html.classList.contains(DARK_MODE_PATTERN_FLY_CLASS_NAME);
};
