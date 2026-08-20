import type { ThemeSetting } from '../types/theme';

// Constants
/** Cookie max age: 1 year in seconds */
const COOKIE_MAX_AGE_ONE_YEAR = 31536000;

/**
 * Cookie options for setting cookies
 *
 * Used when setting cookies to control their behavior and security.
 */
interface CookieOptions {
  /** Max age in seconds (default: 1 year) */
  maxAge?: number;
  /** Cookie path (default: '/') */
  path?: string;
  /** SameSite attribute (default: 'Lax') */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Secure flag (default: false in dev, true in prod) */
  secure?: boolean;
}

/**
 * Theme values from cookies (Read operation)
 *
 * Structure returned when reading theme preferences from cookies.
 * Both fields are REQUIRED because defaults are always provided:
 * - themeSetting defaults to 'system' if not set
 * - headerInverse defaults to false if not set
 *
 * Used for both client-side and server-side rendering to maintain
 * consistent theme state.
 *
 * @see ThemeValues for the write operation interface
 */
interface ThemeFromCookies {
  /** Theme setting preference (system, light, or dark) - always present */
  themeSetting: ThemeSetting;
  /** Whether the header uses inverse/complementary colors - always present */
  headerInverse: boolean;
}

/**
 * Theme values to set in cookies (Write operation)
 *
 * Structure used when updating theme preferences in cookies.
 * Both properties are OPTIONAL to allow partial updates - you can update
 * just the theme setting, just the header inverse, or both.
 *
 * Note: While this could be defined as `Partial<ThemeFromCookies>`, keeping
 * it separate provides better documentation and makes the read/write distinction
 * explicit in the type system.
 *
 * @see ThemeFromCookies for the read operation interface
 */
interface ThemeValues {
  /** Theme setting preference to update (optional) */
  themeSetting?: ThemeSetting;
  /** Header inverse setting to update (optional) */
  headerInverse?: boolean;
}

/**
 * Parse cookies from a cookie string (from document.cookie or request headers).
 * Handles edge cases like cookies with '=' in their values.
 */
export function parseCookies(cookieString: string | undefined): Record<string, string> {
  if (!cookieString) return {};

  return cookieString.split(';').reduce(
    (cookies, cookie) => {
      const trimmed = cookie.trim();
      const equalsIndex = trimmed.indexOf('=');

      if (equalsIndex > 0) {
        const name = trimmed.substring(0, equalsIndex);
        const value = trimmed.substring(equalsIndex + 1);

        if (name && value) {
          try {
            cookies[name] = decodeURIComponent(value);
          } catch {
            // If decoding fails, use the raw value
            cookies[name] = value;
          }
        }
      }
      return cookies;
    },
    {} as Record<string, string>,
  );
}

/**
 * Get a cookie value by name (client-side only).
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = parseCookies(document.cookie);
  return cookies[name] || null;
}

/**
 * Validate cookie value before setting.
 * Checks for invalid characters in cookie values (control characters, whitespace, special chars).
 */
function isValidCookieValue(value: string): boolean {
  // Check for invalid characters in cookie values
  // Cookies cannot contain control characters, whitespace, or certain special chars
  // eslint-disable-next-line no-control-regex
  return typeof value === 'string' && !/[\x00-\x1F\x7F;, ]/.test(value);
}

/**
 * Set a cookie (client-side only).
 * Validates the cookie value and applies security defaults.
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  // Validate cookie value before encoding
  const encodedValue = encodeURIComponent(value);
  if (!isValidCookieValue(encodedValue)) {
    console.warn(`Invalid cookie value for "${name}": contains invalid characters`);
    return;
  }

  const {
    maxAge = COOKIE_MAX_AGE_ONE_YEAR,
    path = '/',
    sameSite = 'Lax',
    secure = window.location.protocol === 'https:',
  } = options;

  let cookieString = `${name}=${encodedValue}`;
  cookieString += `; Path=${path}`;
  cookieString += `; Max-Age=${maxAge}`;
  cookieString += `; SameSite=${sameSite}`;

  if (secure) {
    cookieString += '; Secure';
  }

  document.cookie = cookieString;
}

/**
 * Get theme values from cookies.
 * Can be used client-side (reads from document.cookie) or server-side (pass cookie string).
 * Always returns both values with defaults applied.
 */
export function getThemeFromCookies(cookieString?: string): ThemeFromCookies {
  const rawCookieString = cookieString ?? (typeof document !== 'undefined' ? document.cookie : '');
  const cookies = parseCookies(rawCookieString);

  const themeSetting = cookies['theme-setting'] || 'system';
  const headerInverse = cookies['header-inverse'] === 'true';

  // Validate theme setting value
  const validThemeSettings: ThemeSetting[] = ['system', 'light', 'dark'];
  const validatedThemeSetting = validThemeSettings.includes(themeSetting as ThemeSetting)
    ? (themeSetting as ThemeSetting)
    : 'system';

  return {
    themeSetting: validatedThemeSetting,
    headerInverse,
  };
}

/**
 * Set theme values in cookies (client-side only).
 * Supports partial updates - you can set just themeSetting, just headerInverse, or both.
 */
export function setThemeInCookies(values: ThemeValues): void {
  if (values.themeSetting !== undefined) {
    // Validate theme setting before setting cookie
    const validThemeSettings: ThemeSetting[] = ['system', 'light', 'dark'];
    if (validThemeSettings.includes(values.themeSetting)) {
      setCookie('theme-setting', values.themeSetting);
    } else {
      console.warn(`Invalid theme setting: ${values.themeSetting}`);
    }
  }
  if (values.headerInverse !== undefined) {
    setCookie('header-inverse', String(values.headerInverse));
  }
}
