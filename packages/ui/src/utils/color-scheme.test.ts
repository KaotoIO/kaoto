import { DARK_MODE_PATTERN_FLY_CLASS_NAME, setColorScheme, isDarkModeEnabled } from './color-scheme';
import { ColorScheme } from '../models';

describe('color-scheme utilities', () => {
  let htmlElement: HTMLElement;

  beforeEach(() => {
    htmlElement = document.createElement('html');
    document.querySelector = jest.fn().mockReturnValue(htmlElement);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setColorScheme', () => {
    it('sets light mode by removing the dark mode class', () => {
      htmlElement.classList.add(DARK_MODE_PATTERN_FLY_CLASS_NAME);

      setColorScheme(ColorScheme.Light);

      expect(htmlElement.classList.contains(DARK_MODE_PATTERN_FLY_CLASS_NAME)).toBe(false);
    });

    it('sets dark mode by adding the dark mode class', () => {
      setColorScheme(ColorScheme.Dark);

      expect(htmlElement.classList.contains(DARK_MODE_PATTERN_FLY_CLASS_NAME)).toBe(true);
    });

    it('sets color scheme to system preference when scheme is Auto', () => {
      const mockMatchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
      }));
      window.matchMedia = mockMatchMedia;

      setColorScheme(ColorScheme.Auto);

      expect(htmlElement.classList.contains(DARK_MODE_PATTERN_FLY_CLASS_NAME)).toBe(true);
    });

    it('does nothing if the HTML element is not found', () => {
      document.querySelector = jest.fn().mockReturnValue(null);

      expect(() => setColorScheme(ColorScheme.Light)).not.toThrow();
    });
  });

  describe('isDarkModeEnabled', () => {
    it('returns true if the dark mode class is present', () => {
      htmlElement.classList.add(DARK_MODE_PATTERN_FLY_CLASS_NAME);

      expect(isDarkModeEnabled()).toBe(true);
    });

    it('returns false if the dark mode class is not present', () => {
      expect(isDarkModeEnabled()).toBe(false);
    });

    it('returns false if the HTML element is not found', () => {
      document.querySelector = jest.fn().mockReturnValue(null);

      expect(isDarkModeEnabled()).toBe(false);
    });
  });
});
