import { Editor } from '@monaco-editor/react';
import { FunctionComponent } from 'react';

import { StoredFile } from '../../../services/files/stored-file';
import { languageForPath } from './language-for-path';
import { useDebouncedSave } from './use-debounced-save';

interface TextFileEditorProps {
  file: Pick<StoredFile, 'id' | 'path' | 'content'>;
  onSave: (fileId: string, content: string) => void;
}

/** PatternFly switches its tokens to dark through this class, which kaoto-web keeps in line with its theme */
const isDarkTheme = () => document.documentElement.classList.contains('pf-v6-theme-dark');

/**
 * Edits a file that has no editor of its own as text.
 *
 * Monaco itself is set up by `@kaoto/kaoto` (the bundled Monaco instead of the CDN, and its workers). Mount it once per
 * file (`key`), so that its undo history and pending save stay with the file.
 */
export const TextFileEditor: FunctionComponent<TextFileEditorProps> = ({ file, onSave }) => {
  const { schedule } = useDebouncedSave(onSave);

  return (
    <Editor
      wrapperProps={{ className: 'cs--integration-shell__text-editor' }}
      defaultValue={file.content}
      defaultLanguage={languageForPath(file.path)}
      theme={isDarkTheme() ? 'vs-dark' : 'light'}
      options={{ automaticLayout: true, scrollBeyondLastLine: false }}
      onChange={(content) => {
        schedule(file.id, content ?? '');
      }}
    />
  );
};
