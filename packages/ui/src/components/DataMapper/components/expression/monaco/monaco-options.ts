import * as monaco from 'monaco-editor';

export const xpathEditorTheme = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'identifier', foreground: '0b3c0b', fontStyle: 'bold' },
    { token: 'action', foreground: '641564', fontStyle: 'italic' },
    { token: 'number', foreground: '0f2386', fontStyle: 'none' },
    { token: 'number.float', foreground: '0f2386', fontStyle: 'none' },
  ],
  colors: {
    'editor.foreground': '#000000',
    'editor.background': '#EDF9FA',
    'editorCursor.foreground': '#8B0000',
    'editor.lineHighlightBackground': '#0000FF20',
    'editor.selectionBackground': '#88000030',
    'editor.inactiveSelectionBackground': '#88000015',
  },
} as monaco.editor.IStandaloneThemeData;

export const xpathEditorConstrufctionOption = {
  language: 'xpath',
  wordWrap: 'on',
  scrollBeyondLastColumn: 0,
  scrollbar: {
    horizontal: 'hidden',
    horizontalHasArrows: false,
    vertical: 'auto',
    verticalHasArrows: false,
  },
} as monaco.editor.IStandaloneEditorConstructionOptions;
