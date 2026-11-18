import { FunctionComponent } from 'react';

import { useFiles } from '../../hooks/useFiles';
import { buildRenamedPath } from '../../services/files/file-path';
import { StoredFile } from '../../services/files/stored-file';
import { NameField, NameResult } from './NameField';

interface RenameFieldProps {
  file: StoredFile;
  /**
   * Called once renaming is over, after the file was renamed or renaming was cancelled.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree item; when the field lost
   * the focus, it stays where the user put it
   */
  onDone: (byKeyboard: boolean) => void;
}

const TAKEN = 'A file with that name already exists';

/**
 * Renames a file in place of its name in the Explorer.
 *
 * Enter and clicking elsewhere rename the file, Escape cancels. Clicking elsewhere with a name that cannot be used
 * cancels as well, while Enter keeps the field open with the error. The part of the name before its first dot is
 * selected, so that typing replaces the name and keeps the extension.
 */
export const RenameField: FunctionComponent<RenameFieldProps> = ({ file, onDone }) => {
  const { files, renameFile } = useFiles();

  const validate = (name: string): NameResult => {
    const result = buildRenamedPath(file.path, name);
    if ('error' in result) return result;
    if (result.path === file.path) return 'unchanged';
    if (files.some((candidate) => candidate.path === result.path)) return { error: TAKEN };
    return result;
  };

  return (
    <NameField
      id={`cs--explorer-rename-${file.id}`}
      label="Rename file"
      initialName={file.path.slice(file.path.lastIndexOf('/') + 1)}
      data-testid="explorer-rename-input"
      validate={validate}
      commit={(path) => renameFile(file.id, path)}
      onDone={onDone}
    />
  );
};
