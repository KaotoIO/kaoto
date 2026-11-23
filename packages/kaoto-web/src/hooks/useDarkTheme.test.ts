import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockSystemColorScheme } from '../test/system-color-scheme';
import { setThemeSetting } from '../utils/theme';
import { useDarkTheme } from './useDarkTheme';

describe('useDarkTheme', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.themeSetting;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.themeSetting;
  });

  it.each([
    { themeSetting: 'dark', expected: true },
    { themeSetting: 'light', expected: false },
  ])('should be $expected for the "$themeSetting" setting', ({ themeSetting, expected }) => {
    mockSystemColorScheme(false);
    document.documentElement.dataset.themeSetting = themeSetting;

    const { result } = renderHook(() => useDarkTheme());

    expect(result.current).toBe(expected);
  });

  it('should follow a change of the theme setting', () => {
    mockSystemColorScheme(false);
    document.documentElement.dataset.themeSetting = 'light';
    const { result } = renderHook(() => useDarkTheme());

    act(() => {
      setThemeSetting('dark');
    });

    expect(result.current).toBe(true);
  });

  it('should follow the OS while the setting is "system"', () => {
    const setSystemPrefersDark = mockSystemColorScheme(false);
    document.documentElement.dataset.themeSetting = 'system';
    const { result } = renderHook(() => useDarkTheme());

    act(() => {
      setSystemPrefersDark(true);
    });

    expect(result.current).toBe(true);
  });

  it('should stop listening to the OS when unmounted', () => {
    const setSystemPrefersDark = mockSystemColorScheme(false);
    const { unmount } = renderHook(() => useDarkTheme());

    unmount();

    expect(setSystemPrefersDark.listenerCount()).toBe(0);
  });
});
