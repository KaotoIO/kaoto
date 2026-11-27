import * as monaco from 'monaco-editor';
import { useLayoutEffect } from 'react';

import { useDarkTheme } from '../../../hooks/useDarkTheme';

/** The colour of the canvas in the Design view, which the Code view takes in the Kaoto style */
const CANVAS_COLOUR = '--cs-canvas';

/**
 * The name of the Monaco theme for the code editors, following the light or dark theme of kaoto-web.
 *
 * In the Carbon style these are Monaco's own `vs` and `vs-dark`. In the Kaoto style they are variants of them with the
 * background of the canvas, so that the Code view looks like the Design view; the variant is defined with the canvas
 * colour of the moment, before the editor applies it.
 */
export const useMonacoTheme = (): string => {
  const isDark = useDarkTheme();
  const base = isDark ? 'vs-dark' : 'vs';
  const isKaotoStyle = document.documentElement.dataset.themeStyle === 'kaoto';
  const name = isKaotoStyle ? `kaoto-${base}` : base;

  // A layout effect runs before the editor's own effects, which apply the theme by its name
  useLayoutEffect(
    function defineCanvasTheme() {
      if (!isKaotoStyle) return;
      const canvas = getComputedStyle(document.documentElement).getPropertyValue(CANVAS_COLOUR).trim();
      monaco.editor.defineTheme(name, { base, inherit: true, rules: [], colors: { 'editor.background': canvas } });
    },
    [isKaotoStyle, name, base],
  );

  return name;
};
