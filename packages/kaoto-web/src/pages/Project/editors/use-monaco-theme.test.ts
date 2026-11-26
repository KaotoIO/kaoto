import { renderHook } from '@testing-library/react';
import * as monaco from 'monaco-editor';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockSystemColorScheme } from '../../../test/system-color-scheme';
import { useMonacoTheme } from './use-monaco-theme';

describe('useMonacoTheme', () => {
  beforeEach(() => {
    mockSystemColorScheme(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.themeSetting;
    delete document.documentElement.dataset.themeStyle;
    document.documentElement.style.removeProperty('--cs-canvas');
  });

  it.each([
    { themeStyle: 'carbon', themeSetting: 'light', theme: 'vs' },
    { themeStyle: 'carbon', themeSetting: 'dark', theme: 'vs-dark' },
    { themeStyle: 'kaoto', themeSetting: 'light', theme: 'kaoto-vs' },
    { themeStyle: 'kaoto', themeSetting: 'dark', theme: 'kaoto-vs-dark' },
  ])(
    'uses the $theme theme in the $themeStyle style with the $themeSetting setting',
    ({ themeStyle, themeSetting, theme }) => {
      document.documentElement.dataset.themeStyle = themeStyle;
      document.documentElement.dataset.themeSetting = themeSetting;

      const { result } = renderHook(() => useMonacoTheme());

      expect(result.current).toBe(theme);
    },
  );

  it('gives the theme of the Kaoto style the background of the canvas', () => {
    const defineTheme = vi.spyOn(monaco.editor, 'defineTheme');
    document.documentElement.dataset.themeStyle = 'kaoto';
    document.documentElement.dataset.themeSetting = 'dark';
    document.documentElement.style.setProperty('--cs-canvas', '#333333');

    renderHook(() => useMonacoTheme());

    expect(defineTheme).toHaveBeenCalledWith('kaoto-vs-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#333333' },
    });
  });

  it('keeps the themes of Monaco in the Carbon style', () => {
    const defineTheme = vi.spyOn(monaco.editor, 'defineTheme');
    document.documentElement.dataset.themeStyle = 'carbon';

    renderHook(() => useMonacoTheme());

    expect(defineTheme).not.toHaveBeenCalled();
  });
});
