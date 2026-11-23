import { FunctionComponent } from 'react';

import { CodeEditor } from './CodeEditor';
import { OpenFile } from './open-file';
import { useDebouncedSave } from './use-debounced-save';

interface TextFileEditorProps {
  file: OpenFile;
  onSave: (key: string, content: string) => void;
}

/**
 * Edits a file that has no editor of its own as text, and saves once typing pauses.
 *
 * Give it a `key` per file, so that its content and a pending save stay with the file.
 */
export const TextFileEditor: FunctionComponent<TextFileEditorProps> = ({ file, onSave }) => {
  const { schedule } = useDebouncedSave(onSave);

  const handleChange = (content: string) => {
    schedule(file.key, content);
  };

  return <CodeEditor path={file.path} initialContent={file.content} onChange={handleChange} />;
};
