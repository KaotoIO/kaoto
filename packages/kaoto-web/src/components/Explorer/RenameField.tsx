import { FunctionComponent, useRef } from 'react';

import { ProjectFile } from '../../context/FilesContextDefinition';
import { useFiles } from '../../hooks/useFiles';
import { buildRenamedPath } from '../../services/files/file-path';
import { NameField, NameResult } from './NameField';
import { TAKEN, takenPaths } from './taken-paths';

interface RenameFieldProps {
  file: ProjectFile;
  /**
   * Called once renaming is over, after the file was renamed or renaming was cancelled.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree item; when the field lost
   * the focus, it stays where the user put it
   * @param renamedPath the new path of the file, or undefined when renaming was cancelled or the name is unchanged
   */
  onDone: (byKeyboard: boolean, renamedPath: string | undefined) => void;
  /**
   * Called as soon as the file is renamed in storage, also when another entry's field has replaced this one by then
   * and `onDone` is not called any more.
   */
  onRenamed: (fromPath: string, toPath: string) => void;
}

/**
 * Renames a file in place of its name in the Explorer.
 *
 * Enter and clicking elsewhere rename the file, Escape cancels. Clicking elsewhere with a name that cannot be used
 * cancels as well, while Enter keeps the field open with the error. The part of the name before its first dot is
 * selected, so that typing replaces the name and keeps the extension.
 */
export const RenameField: FunctionComponent<RenameFieldProps> = ({ file, onDone, onRenamed }) => {
  const { files, folders, renameFile } = useFiles();
  const renamedPath = useRef<string | undefined>(undefined);

  const validate = (name: string): NameResult => {
    const result = buildRenamedPath(file.path, name);
    if ('error' in result) return result;
    if (result.path === file.path) return 'unchanged';
    if (takenPaths(files, folders).has(result.path)) return { error: TAKEN };
    return result;
  };

  return (
    <NameField
      id={`cs--explorer-rename-${file.id}`}
      label="Rename file"
      initialName={file.path.slice(file.path.lastIndexOf('/') + 1)}
      data-testid="explorer-rename-input"
      validate={validate}
      commit={async (path) => {
        await renameFile(file.id, path);
        renamedPath.current = path;
        onRenamed(file.path, path);
      }}
      onDone={(byKeyboard) => {
        onDone(byKeyboard, renamedPath.current);
      }}
    />
  );
};
