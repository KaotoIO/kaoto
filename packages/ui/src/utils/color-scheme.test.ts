import { ColorScheme } from '../models';
import { DARK_MODE_PATTERN_FLY_CLASS_NAME, isDarkModeEnabled, setColorScheme } from './color-scheme';

describe('color-scheme utilities', () => {
  let htmlElement: HTMLElement;

  beforeEach(() => {
    htmlElement = document.createElement('html');
    vi.spyOn(document, 'querySelector').mockReturnValue(htmlElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      vi.spyOn(globalThis, 'matchMedia').mockImplementation(
        (query) => ({ matches: query === '(prefers-color-scheme: dark)' }) as MediaQueryList,
      );

      setColorScheme(ColorScheme.Auto);

      expect(htmlElement.classList.contains(DARK_MODE_PATTERN_FLY_CLASS_NAME)).toBe(true);
    });

    it('does nothing if the HTML element is not found', () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      expect(() => {
        setColorScheme(ColorScheme.Light);
      }).not.toThrow();
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
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      expect(isDarkModeEnabled()).toBe(false);
    });
  });
});
