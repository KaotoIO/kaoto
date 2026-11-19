/**
 * User's theme preference setting.
 * - 'system': Follow the operating system's theme preference
 * - 'light': Always use light theme (g10)
 * - 'dark': Always use dark theme (g100)
 */
export type ThemeSetting = 'system' | 'light' | 'dark';

/**
 * The look of the app, independent of the light/dark setting.
 * - 'kaoto': Carbon plus the Kaoto layer (floating cards, blue accents, tinted surfaces)
 * - 'carbon': the plain IBM Carbon theme
 */
export type ThemeStyle = 'kaoto' | 'carbon';
