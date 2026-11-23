import './CodeEditor.scss';

import { Editor } from '@monaco-editor/react';
import { FunctionComponent } from 'react';

import { useDarkTheme } from '../../../hooks/useDarkTheme';
import { languageForPath } from './language-for-path';
import { setUpMonaco } from './monaco-setup';

setUpMonaco();

interface CodeEditorProps {
  /** Path of the file; its extension picks the language */
  path: string;
  initialContent: string;
  onChange: (content: string) => void;
}

const OPTIONS = { automaticLayout: true, scrollBeyondLastLine: false };

/**
 * Monaco editor for the content of one file, in the light or dark theme of kaoto-web.
 *
 * It keeps its own content after the start, so give it a `key` per file to start over with another one.
 */
export const CodeEditor: FunctionComponent<CodeEditorProps> = ({ path, initialContent, onChange }) => {
  const isDark = useDarkTheme();

  return (
    <Editor
      wrapperProps={{ className: 'cs--code-editor' }}
      defaultValue={initialContent}
      defaultLanguage={languageForPath(path)}
      theme={isDark ? 'vs-dark' : 'vs'}
      options={OPTIONS}
      onChange={(content) => {
        onChange(content ?? '');
      }}
    />
  );
};
