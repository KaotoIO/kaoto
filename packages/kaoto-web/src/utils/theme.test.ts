import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getThemeSettings, initializeTheme, setHeaderInverse, setThemeSetting, setThemeStyle } from './theme';

const clearState = () => {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
  delete document.documentElement.dataset.themeSetting;
  delete document.documentElement.dataset.headerInverse;
  delete document.documentElement.dataset.themeStyle;
  document.documentElement.classList.remove('pf-v6-theme-dark');
};

/** Stubs the OS colour scheme; the returned function changes it and notifies the listeners, like the browser does. */
const mockSystemColorScheme = (prefersDark: boolean) => {
  const listeners = new Set<() => void>();
  const mediaQueryList = {
    matches: prefersDark,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQueryList),
  );

  return (nextPrefersDark: boolean) => {
    mediaQueryList.matches = nextPrefersDark;
    for (const listener of listeners) listener();
  };
};

const isPatternFlyDark = () => document.documentElement.classList.contains('pf-v6-theme-dark');

describe('theme', () => {
  beforeEach(() => {
    clearState();
    mockSystemColorScheme(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearState();
  });

  describe('getThemeSettings', () => {
    it('should return the defaults when there are no cookies', () => {
      expect(getThemeSettings()).toEqual({ themeSetting: 'system', headerInverse: false, themeStyle: 'kaoto' });
    });

    it('should return the values stored in the cookies', () => {
      document.cookie = 'theme-setting=dark';
      document.cookie = 'header-inverse=true';
      document.cookie = 'theme-style=carbon';

      expect(getThemeSettings()).toEqual({ themeSetting: 'dark', headerInverse: true, themeStyle: 'carbon' });
    });
  });

  describe('setThemeSetting', () => {
    it('should store the cookie and update the html attribute', () => {
      setThemeSetting('dark');

      expect(document.documentElement.dataset.themeSetting).toBe('dark');
      expect(getThemeSettings().themeSetting).toBe('dark');
    });
  });

  describe('setHeaderInverse', () => {
    it('should store the cookie and update the html attribute', () => {
      setHeaderInverse(true);

      expect(document.documentElement.dataset.headerInverse).toBe('true');
      expect(getThemeSettings().headerInverse).toBe(true);
    });
  });

  describe('setThemeStyle', () => {
    it('should store the cookie and update the html attribute', () => {
      setThemeStyle('carbon');

      expect(document.documentElement.dataset.themeStyle).toBe('carbon');
      expect(getThemeSettings().themeStyle).toBe('carbon');
    });
  });

  describe('initializeTheme', () => {
    it('should set the html attributes from the cookies when they are missing', () => {
      document.cookie = 'theme-setting=light';
      document.cookie = 'header-inverse=true';
      document.cookie = 'theme-style=carbon';

      initializeTheme();

      expect(document.documentElement.dataset.themeSetting).toBe('light');
      expect(document.documentElement.dataset.headerInverse).toBe('true');
      expect(document.documentElement.dataset.themeStyle).toBe('carbon');
    });

    it('should use the defaults when there are no cookies', () => {
      initializeTheme();

      expect(document.documentElement.dataset.themeSetting).toBe('system');
      expect(document.documentElement.dataset.headerInverse).toBe('false');
      expect(document.documentElement.dataset.themeStyle).toBe('kaoto');
    });

    it('should not warn when the attributes match the cookies', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      document.cookie = 'theme-setting=dark';
      document.cookie = 'header-inverse=true';
      document.documentElement.dataset.themeSetting = 'dark';
      document.documentElement.dataset.headerInverse = 'true';

      initializeTheme();

      expect(warn).not.toHaveBeenCalled();
    });

    it('should warn and keep the attributes when they differ from the cookies', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      document.cookie = 'theme-setting=dark';
      document.cookie = 'header-inverse=true';
      document.documentElement.dataset.themeSetting = 'light';
      document.documentElement.dataset.headerInverse = 'false';

      initializeTheme();

      expect(warn).toHaveBeenCalledTimes(2);
      expect(document.documentElement.dataset.themeSetting).toBe('light');
      expect(document.documentElement.dataset.headerInverse).toBe('false');
    });
  });

  describe('PatternFly dark theme', () => {
    it.each([
      { themeSetting: 'dark', prefersDark: false, expected: true },
      { themeSetting: 'light', prefersDark: true, expected: false },
      { themeSetting: 'system', prefersDark: true, expected: true },
      { themeSetting: 'system', prefersDark: false, expected: false },
    ] as const)(
      'should be $expected on start for "$themeSetting" when the OS prefers dark: $prefersDark',
      ({ themeSetting, prefersDark, expected }) => {
        mockSystemColorScheme(prefersDark);
        document.cookie = `theme-setting=${themeSetting}`;

        initializeTheme();

        expect(isPatternFlyDark()).toBe(expected);
      },
    );

    it('should follow a change of the theme setting', () => {
      initializeTheme();

      setThemeSetting('dark');
      expect(isPatternFlyDark()).toBe(true);

      setThemeSetting('light');
      expect(isPatternFlyDark()).toBe(false);
    });

    it('should follow the OS while the setting is "system"', () => {
      const setSystemPrefersDark = mockSystemColorScheme(false);
      initializeTheme();

      setSystemPrefersDark(true);
      expect(isPatternFlyDark()).toBe(true);

      setSystemPrefersDark(false);
      expect(isPatternFlyDark()).toBe(false);
    });

    it('should ignore the OS while the setting is explicit', () => {
      const setSystemPrefersDark = mockSystemColorScheme(false);
      document.cookie = 'theme-setting=light';
      initializeTheme();

      setSystemPrefersDark(true);

      expect(isPatternFlyDark()).toBe(false);
    });
  });
});
