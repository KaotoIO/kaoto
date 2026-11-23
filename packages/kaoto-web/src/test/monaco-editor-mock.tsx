import type { EditorProps } from '@monaco-editor/react';
import { FunctionComponent } from 'react';

/**
 * Stands in for Monaco's `Editor` from `@monaco-editor/react`, which needs a real browser.
 *
 * All tests of kaoto-web get it through its `vitest-mocks-setup.ts`. It shows the content in a text box that reports
 * what is typed, and exposes the language and theme it was given.
 */
export const MonacoEditorMock: FunctionComponent<EditorProps> = ({
  defaultValue,
  defaultLanguage,
  theme,
  onChange,
  wrapperProps,
}) => (
  <div className={(wrapperProps as { className?: string } | undefined)?.className}>
    <textarea
      aria-label="Code"
      data-language={defaultLanguage}
      data-theme={theme}
      defaultValue={defaultValue}
      onChange={(event) => onChange?.(event.target.value, undefined as never)}
    />
  </div>
);
