import { vi } from 'vitest';

/**
 * Stubs the OS colour scheme; the returned function changes it and notifies the listeners, like the browser does.
 *
 * Undo it with `vi.unstubAllGlobals()`.
 */
export const mockSystemColorScheme = (prefersDark: boolean) => {
  const listeners = new Set<() => void>();
  const mediaQueryList = {
    matches: prefersDark,
    addEventListener: vi.fn((_type: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: () => void) => listeners.delete(listener)),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQueryList),
  );

  const setSystemPrefersDark = (nextPrefersDark: boolean) => {
    mediaQueryList.matches = nextPrefersDark;
    for (const listener of listeners) listener();
  };

  return Object.assign(setSystemPrefersDark, {
    /** How many listeners are still subscribed to the colour scheme */
    listenerCount: () => listeners.size,
  });
};
