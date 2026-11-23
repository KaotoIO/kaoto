import { FunctionComponent } from 'react';

import { buildRenamedPath } from '../../services/files/file-path';
import { FileEntry } from '../../store/files/files-ui-state';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { NameField, NameResult } from './NameField';
import { TAKEN, takenPaths } from './taken-paths';

interface RenameFieldProps {
  file: FileEntry;
  /**
   * Called once renaming is over, after the file was renamed or renaming was cancelled.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree item; when the field lost
   * the focus, it stays where the user put it
   */
  onDone: (byKeyboard: boolean) => void;
}

/**
 * Renames a file in place of its name in the Explorer.
 *
 * Enter and clicking elsewhere rename the file, Escape cancels. Clicking elsewhere with a name that cannot be used
 * cancels as well, while Enter keeps the field open with the error. The part of the name before its first dot is
 * selected, so that typing replaces the name and keeps the extension.
 */
export const RenameField: FunctionComponent<RenameFieldProps> = ({ file, onDone }) => {
  const entries = useFilesUiStore((state) => state.entries);
  const store = useFilesUiStoreApi();

  const validate = (name: string): NameResult => {
    const result = buildRenamedPath(file.path, name);
    if ('error' in result) return result;
    if (result.path === file.path) return 'unchanged';
    if (takenPaths(entries).has(result.path)) return { error: TAKEN };
    return result;
  };

  return (
    <NameField
      id={`cs--explorer-rename-${file.key}`}
      label="Rename file"
      initialName={file.name}
      data-testid="explorer-rename-input"
      validate={validate}
      commit={async (path) => {
        await store.getState().moveFile(file.key, path);
      }}
      onDone={onDone}
    />
  );
};
