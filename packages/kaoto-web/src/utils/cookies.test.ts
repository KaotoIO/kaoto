import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCookie, getThemeFromCookies, parseCookies, setCookie, setThemeInCookies } from './cookies';

const clearCookies = () => {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
};

describe('cookies', () => {
  beforeEach(() => {
    clearCookies();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearCookies();
  });

  describe('parseCookies', () => {
    it.each([[undefined], ['']])('should return an empty object for %j', (input) => {
      expect(parseCookies(input)).toEqual({});
    });

    it('should parse multiple cookies', () => {
      expect(parseCookies('a=1; b=2;c=3')).toEqual({ a: '1', b: '2', c: '3' });
    });

    it('should keep the "=" characters inside the value', () => {
      expect(parseCookies('token=abc=def==')).toEqual({ token: 'abc=def==' });
    });

    it('should decode URI encoded values', () => {
      expect(parseCookies('name=hello%20world')).toEqual({ name: 'hello world' });
    });

    it('should use the raw value when decoding fails', () => {
      expect(parseCookies('bad=%E0%A4%A')).toEqual({ bad: '%E0%A4%A' });
    });

    it('should ignore entries without a name or a value', () => {
      expect(parseCookies('=novalue; noname=; justtext; ok=1')).toEqual({ ok: '1' });
    });
  });

  describe('getCookie', () => {
    it('should return the cookie value', () => {
      document.cookie = 'foo=bar';

      expect(getCookie('foo')).toBe('bar');
    });

    it('should return null when the cookie does not exist', () => {
      expect(getCookie('missing')).toBeNull();
    });
  });

  describe('setCookie', () => {
    it('should set a cookie that can be read back', () => {
      setCookie('foo', 'bar baz');

      expect(getCookie('foo')).toBe('bar baz');
    });

    it('should apply the provided options', () => {
      const cookieSetter = vi.spyOn(document, 'cookie', 'set');

      setCookie('foo', 'bar', { maxAge: 10, path: '/projects', sameSite: 'Strict', secure: true });

      expect(cookieSetter).toHaveBeenCalledWith('foo=bar; Path=/projects; Max-Age=10; SameSite=Strict; Secure');
    });
  });

  describe('getThemeFromCookies', () => {
    it('should return the defaults when there are no cookies', () => {
      expect(getThemeFromCookies()).toEqual({ themeSetting: 'system', headerInverse: false });
    });

    it('should read the values from document.cookie', () => {
      document.cookie = 'theme-setting=dark';
      document.cookie = 'header-inverse=true';

      expect(getThemeFromCookies()).toEqual({ themeSetting: 'dark', headerInverse: true });
    });

    it('should read the values from the provided cookie string', () => {
      expect(getThemeFromCookies('theme-setting=light; header-inverse=true')).toEqual({
        themeSetting: 'light',
        headerInverse: true,
      });
    });

    it('should fall back to "system" for an invalid theme setting', () => {
      expect(getThemeFromCookies('theme-setting=purple').themeSetting).toBe('system');
    });

    it('should treat any header-inverse value other than "true" as false', () => {
      expect(getThemeFromCookies('header-inverse=yes').headerInverse).toBe(false);
    });
  });

  describe('setThemeInCookies', () => {
    it('should set both values', () => {
      setThemeInCookies({ themeSetting: 'dark', headerInverse: true });

      expect(getThemeFromCookies()).toEqual({ themeSetting: 'dark', headerInverse: true });
    });

    it('should support updating only the theme setting', () => {
      setThemeInCookies({ themeSetting: 'light' });

      expect(getCookie('theme-setting')).toBe('light');
      expect(getCookie('header-inverse')).toBeNull();
    });

    it('should support updating only the header inverse', () => {
      setThemeInCookies({ headerInverse: false });

      expect(getCookie('theme-setting')).toBeNull();
      expect(getCookie('header-inverse')).toBe('false');
    });

    it('should not set an invalid theme setting', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // @ts-expect-error testing an invalid value
      setThemeInCookies({ themeSetting: 'purple' });

      expect(warn).toHaveBeenCalledWith('Invalid theme setting: purple');
      expect(getCookie('theme-setting')).toBeNull();
    });
  });
});
