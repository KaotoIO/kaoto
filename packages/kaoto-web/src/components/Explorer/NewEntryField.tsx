import { FunctionComponent, useRef } from 'react';

import { CATALOG_URL } from '../../catalog-url';
import { useFiles } from '../../hooks/useFiles';
import { buildChildPath } from '../../services/files/file-path';
import { fetchStarterTemplate, resolveStarterTemplate } from '../../services/templates/starter-templates';
import { FILE_KINDS } from '../CreateFileModal/file-kinds';
import { toFolderId } from './build-tree';
import { NameField, NameResult } from './NameField';
import { TAKEN, takenPaths } from './taken-paths';

export type NewEntryKind = 'file' | 'folder';

export interface CreatedEntry {
  /** The id of its tree node */
  id: string;
  path: string;
}

interface NewEntryFieldProps {
  kind: NewEntryKind;
  /** The folder the entry is created in, empty for the root */
  folderPath: string;
  /**
   * Called once naming is over.
   *
   * @param byKeyboard whether Enter or Escape ended it
   * @param created the tree node id and the path of the created file or folder, or undefined when it was cancelled
   */
  onDone: (byKeyboard: boolean, created: CreatedEntry | undefined) => void;
}

/**
 * Names a new file or folder in place in the Explorer tree.
 *
 * A file whose name ends with the extension of a Create New File kind starts from that kind's starter template; any
 * other file starts empty.
 */
export const NewEntryField: FunctionComponent<NewEntryFieldProps> = ({ kind, folderPath, onDone }) => {
  const { files, folders, createFile, createFolder } = useFiles();
  const created = useRef<CreatedEntry | undefined>(undefined);

  const validate = (name: string): NameResult => {
    const result = buildChildPath(folderPath, name, kind);
    if ('path' in result && takenPaths(files, folders).has(result.path)) return { error: TAKEN };
    return result;
  };

  const commit = async (path: string) => {
    if (kind === 'folder') {
      await createFolder(path);
      created.current = { id: toFolderId(path), path };
      return;
    }
    const fileKind = FILE_KINDS.find(({ extension }) => path.endsWith(extension));
    const fileName = path.slice(path.lastIndexOf('/') + 1);
    const content = fileKind
      ? resolveStarterTemplate(await fetchStarterTemplate(CATALOG_URL, fileKind.template), fileName)
      : '';
    created.current = { id: (await createFile({ path, content })).id, path };
  };

  return (
    <NameField
      id={`cs--explorer-new-${kind}`}
      label={kind === 'file' ? 'New file name' : 'New folder name'}
      initialName=""
      data-testid="explorer-new-input"
      validate={validate}
      commit={commit}
      onDone={(byKeyboard) => {
        onDone(byKeyboard, created.current);
      }}
    />
  );
};
