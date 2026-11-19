import { FunctionComponent, useRef } from 'react';

import { useFiles } from '../../hooks/useFiles';
import { buildChildPath } from '../../services/files/file-path';
import { NameField, NameResult } from './NameField';
import { TAKEN, takenPaths } from './taken-paths';

interface RenameFolderFieldProps {
  folderPath: string;
  /**
   * Called once renaming is over.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree item
   * @param renamedPath the new path of the folder, or undefined when renaming was cancelled or the name is unchanged
   */
  onDone: (byKeyboard: boolean, renamedPath: string | undefined) => void;
  /**
   * Called as soon as the folder is renamed in storage, also when another entry's field has replaced this one by then
   * and `onDone` is not called any more.
   */
  onRenamed: (fromPath: string, toPath: string) => void;
}

/** Renames a folder in place of its name in the Explorer; everything in it moves along */
export const RenameFolderField: FunctionComponent<RenameFolderFieldProps> = ({ folderPath, onDone, onRenamed }) => {
  const { files, folders, renameFolder } = useFiles();
  const renamedPath = useRef<string | undefined>(undefined);
  const slash = folderPath.lastIndexOf('/');
  const parentPath = slash === -1 ? '' : folderPath.slice(0, slash);

  const validate = (name: string): NameResult => {
    const result = buildChildPath(parentPath, name, 'folder');
    if ('error' in result) return result;
    if (result.path === folderPath) return 'unchanged';
    if (takenPaths(files, folders).has(result.path)) return { error: TAKEN };
    return result;
  };

  const commit = async (path: string) => {
    await renameFolder(folderPath, path);
    renamedPath.current = path;
    onRenamed(folderPath, path);
  };

  return (
    <NameField
      id={`cs--explorer-rename-folder-${folderPath}`}
      label="Rename folder"
      initialName={folderPath.slice(slash + 1)}
      data-testid="explorer-rename-input"
      validate={validate}
      commit={commit}
      onDone={(byKeyboard) => {
        onDone(byKeyboard, renamedPath.current);
      }}
    />
  );
};
