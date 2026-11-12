import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getThemeSettings, initializeTheme, setHeaderInverse, setThemeSetting } from './theme';

const clearState = () => {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
  delete document.documentElement.dataset.themeSetting;
  delete document.documentElement.dataset.headerInverse;
};

describe('theme', () => {
  beforeEach(() => {
    clearState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearState();
  });

  describe('getThemeSettings', () => {
    it('should return the defaults when there are no cookies', () => {
      expect(getThemeSettings()).toEqual({ themeSetting: 'system', headerInverse: false });
    });

    it('should return the values stored in the cookies', () => {
      document.cookie = 'theme-setting=dark';
      document.cookie = 'header-inverse=true';

      expect(getThemeSettings()).toEqual({ themeSetting: 'dark', headerInverse: true });
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

  describe('initializeTheme', () => {
    it('should set the html attributes from the cookies when they are missing', () => {
      document.cookie = 'theme-setting=light';
      document.cookie = 'header-inverse=true';

      initializeTheme();

      expect(document.documentElement.dataset.themeSetting).toBe('light');
      expect(document.documentElement.dataset.headerInverse).toBe('true');
    });

    it('should use the defaults when there are no cookies', () => {
      initializeTheme();

      expect(document.documentElement.dataset.themeSetting).toBe('system');
      expect(document.documentElement.dataset.headerInverse).toBe('false');
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
});
