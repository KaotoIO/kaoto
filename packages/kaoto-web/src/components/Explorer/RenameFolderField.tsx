import { FunctionComponent } from 'react';

import { buildChildPath } from '../../services/files/file-path';
import { FileEntry } from '../../store/files/files-ui-state';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { NameField, NameResult } from './NameField';
import { TAKEN, takenPaths } from './taken-paths';

interface RenameFolderFieldProps {
  folder: FileEntry;
  /**
   * Called once renaming is over, after the folder was renamed or renaming was cancelled.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree item
   */
  onDone: (byKeyboard: boolean) => void;
}

/** Renames a folder in place of its name in the Explorer; everything in it moves along and keeps its key */
export const RenameFolderField: FunctionComponent<RenameFolderFieldProps> = ({ folder, onDone }) => {
  const entries = useFilesUiStore((state) => state.entries);
  const store = useFilesUiStoreApi();
  const slash = folder.path.lastIndexOf('/');
  const parentPath = slash === -1 ? '' : folder.path.slice(0, slash);

  const validate = (name: string): NameResult => {
    const result = buildChildPath(parentPath, name, 'folder');
    if ('error' in result) return result;
    if (result.path === folder.path) return 'unchanged';
    if (takenPaths(entries).has(result.path)) return { error: TAKEN };
    return result;
  };

  return (
    <NameField
      id={`cs--explorer-rename-folder-${folder.key}`}
      label="Rename folder"
      initialName={folder.name}
      data-testid="explorer-rename-input"
      validate={validate}
      commit={(path) => store.getState().moveFolder(folder.key, path)}
      onDone={onDone}
    />
  );
};
