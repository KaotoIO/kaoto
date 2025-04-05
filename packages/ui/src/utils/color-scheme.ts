import { ColorScheme } from '../models';

export const DARK_MODE_PATTERN_FLY_CLASS_NAME = 'pf-v6-theme-dark';

export const setColorScheme = (scheme: ColorScheme): void => {
  const html = document.querySelector('html');
  if (!html) return;

  let colorScheme = scheme;
  if (scheme === ColorScheme.Auto) {
    colorScheme = getSystemColorScheme();
  }

  if (colorScheme === ColorScheme.Light) {
    html.classList.remove(DARK_MODE_PATTERN_FLY_CLASS_NAME);
  } else {
    html.classList.add(DARK_MODE_PATTERN_FLY_CLASS_NAME);
  }
};

const getSystemColorScheme = (): ColorScheme.Dark | ColorScheme.Light => {
  if (!window.matchMedia) return ColorScheme.Light;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? ColorScheme.Dark : ColorScheme.Light;
};

export const isDarkModeEnabled = (): boolean => {
  const html = document.querySelector('html');
  if (!html) return false;

  return html.classList.contains(DARK_MODE_PATTERN_FLY_CLASS_NAME);
};
