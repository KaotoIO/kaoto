import { render, screen } from '@testing-library/react';

import App from './App';
import { LocalStorageKeys } from './models';
import { ReloadProvider } from './providers';
import { DARK_MODE_CARBON_ATTR_NAME, DARK_MODE_PATTERN_FLY_CLASS_NAME } from './utils/color-scheme';

describe('App', () => {
  beforeEach(() => {
    /* No stored settings, so the default `Auto` color scheme is used */
    localStorage.removeItem(LocalStorageKeys.Settings);
    /* `Auto` follows the system preference, report a dark system theme */
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    document.documentElement.classList.remove(DARK_MODE_PATTERN_FLY_CLASS_NAME);
    document.documentElement.removeAttribute(DARK_MODE_CARBON_ATTR_NAME);
  });

  it('should set color theme', async () => {
    render(
      <ReloadProvider>
        <App />
      </ReloadProvider>,
    );

    await screen.findByTestId('load-default-catalog');
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(document.documentElement).toHaveClass(DARK_MODE_PATTERN_FLY_CLASS_NAME);
    expect(document.documentElement).toHaveAttribute(DARK_MODE_CARBON_ATTR_NAME, 'dark');
  });
});
