import { FunctionComponent, useRef } from 'react';

import { CATALOG_URL } from '../../catalog-url';
import { buildChildPath } from '../../services/files/file-path';
import { fetchStarterTemplate, resolveStarterTemplate } from '../../services/templates/starter-templates';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { FILE_KINDS } from '../CreateFileModal/file-kinds';
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
  const entries = useFilesUiStore((state) => state.entries);
  const store = useFilesUiStoreApi();
  const created = useRef<CreatedEntry | undefined>(undefined);

  const validate = (name: string): NameResult => {
    const result = buildChildPath(folderPath, name, kind);
    if ('path' in result && takenPaths(entries).has(result.path)) return { error: TAKEN };
    return result;
  };

  const commit = async (path: string) => {
    if (kind === 'folder') {
      created.current = { id: (await store.getState().addFolder(path)).key, path };
      return;
    }
    const fileKind = FILE_KINDS.find(
      ({ extension, alternateExtensions }) =>
        path.endsWith(extension) || (alternateExtensions !== undefined && path.endsWith(alternateExtensions)),
    );
    const fileName = path.slice(path.lastIndexOf('/') + 1);
    const content = fileKind
      ? resolveStarterTemplate(await fetchStarterTemplate(CATALOG_URL, fileKind.template), fileName)
      : '';
    created.current = { id: (await store.getState().addFile(path, content)).key, path };
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
