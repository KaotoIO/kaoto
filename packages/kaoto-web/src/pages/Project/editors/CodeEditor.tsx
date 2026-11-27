import './CodeEditor.scss';

import { Editor, OnChange, OnMount } from '@monaco-editor/react';
import { FunctionComponent } from 'react';

import { languageForPath } from './language-for-path';
import { setUpMonaco } from './monaco-setup';
import { useMonacoTheme } from './use-monaco-theme';

setUpMonaco();

interface CodeEditorProps {
  /** Path of the file; its extension picks the language */
  path: string;
  initialContent: string;
  onChange: (content: string) => void;
  /** Take the focus once the editor is ready */
  focusOnMount?: boolean;
}

const OPTIONS = { automaticLayout: true, scrollBeyondLastLine: false };

/**
 * Monaco editor for the content of one file, in the light or dark theme of kaoto-web; in the Kaoto style with the
 * background of the canvas.
 *
 * It keeps its own content after the start: later changes of `initialContent` are not shown. Give it a `key` per file
 * to start over with another one.
 */
export const CodeEditor: FunctionComponent<CodeEditorProps> = ({
  path,
  initialContent,
  onChange,
  focusOnMount = false,
}) => {
  const theme = useMonacoTheme();

  const handleChange: OnChange = (content) => {
    onChange(content ?? '');
  };

  const handleMount: OnMount = (editor) => {
    if (focusOnMount) editor.focus();
  };

  return (
    <Editor
      wrapperProps={{ className: 'cs--code-editor' }}
      defaultValue={initialContent}
      defaultLanguage={languageForPath(path)}
      theme={theme}
      options={OPTIONS}
      onChange={handleChange}
      onMount={handleMount}
    />
  );
};
