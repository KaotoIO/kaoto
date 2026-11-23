import type { EditorProps } from '@monaco-editor/react';
import { FunctionComponent, useEffect, useRef } from 'react';

/**
 * Stands in for Monaco's `Editor` from `@monaco-editor/react`, which needs a real browser.
 *
 * All tests of kaoto-web get it through its `vitest-mocks-setup.ts`. It shows the content in a text box that reports
 * what is typed, and exposes the language and theme it was given. `onMount` gets an editor whose `focus()` focuses the
 * text box.
 */
export const MonacoEditorMock: FunctionComponent<EditorProps> = ({
  defaultValue,
  defaultLanguage,
  theme,
  onChange,
  onMount,
  wrapperProps,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const editor = { focus: () => textareaRef.current?.focus() };
    onMount?.(editor as never, undefined as never);
    // Monaco calls `onMount` once, when the editor is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={(wrapperProps as { className?: string } | undefined)?.className}>
      <textarea
        ref={textareaRef}
        aria-label="Code"
        data-language={defaultLanguage}
        data-theme={theme}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value, undefined as never)}
      />
    </div>
  );
};
