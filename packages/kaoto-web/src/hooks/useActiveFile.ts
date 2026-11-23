import { useParams } from 'react-router';

import { filePathFromSplat } from '../routes/file-url';
import { selectEntryByPath } from '../store/files/files-ui-selectors';
import { FileEntry } from '../store/files/files-ui-state';
import { useFilesUiStore } from '../store/files/use-files-ui-store';

interface ActiveFile {
  /** The file path in the URL, also when there is no file at it */
  path: string | undefined;
  /** The file at that path, once the files are loaded */
  entry: FileEntry | undefined;
}

/** The file the URL opens: the URL holds its path, so that a reload or a bookmark opens it again */
export const useActiveFile = (): ActiveFile => {
  const path = filePathFromSplat(useParams()['*']);
  const entry = useFilesUiStore((state) => {
    if (path === undefined) return undefined;
    const found = selectEntryByPath(path)(state);
    return found?.kind === 'file' ? found : undefined;
  });
  return { path, entry };
};
