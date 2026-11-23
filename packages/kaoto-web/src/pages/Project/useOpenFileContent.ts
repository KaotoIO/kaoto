import { useEffect, useMemo, useState } from 'react';

import { FileEntry } from '../../store/files/files-ui-state';
import { useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { OpenFile } from './editors/open-file';

/** What the last read of a content gave, for the file and the editor it was read for */
type Read = ({ file: OpenFile } | { key: string; error: Error }) & { editor: string | undefined };

interface OpenFileContent {
  /** The file to show: the open one once its content arrived, the previous one until then */
  shown: OpenFile | undefined;
  /** Whether the content of the open file is still on its way */
  loading: boolean;
  /** Why the content of the open file could not be read */
  error: Error | undefined;
}

/**
 * Reads the content of the open file, as the host of the editors.
 *
 * Until the content of a newly opened file arrives, the previous file stays shown, so that its editor stays mounted
 * (re-mounting the canvas would load the Camel catalog again). A content that arrives for a file that is no longer
 * open is dropped. Without an open file nothing is shown, so that the next file starts from the loading state.
 *
 * A file that moves keeps its content, as its editor keeps the edits. When the move takes it to another editor (e.g. a
 * route renamed to a plain YAML file), nothing is shown until its content is read again: the old editor unmounts
 * first and saves its pending edit, and the read waits for that write.
 *
 * @param editor the editor the open file is shown in; another editor for the same file reads its content again
 */
export const useOpenFileContent = (entry: FileEntry | undefined, editor?: string): OpenFileContent => {
  const store = useFilesUiStoreApi();
  const [read, setRead] = useState<Read>();
  if (!entry && read) {
    // Adjust state while rendering (https://react.dev/learn/you-might-not-need-an-effect)
    setRead(undefined);
  }

  const key = entry?.key;
  useEffect(() => {
    if (key === undefined) return;
    let isCurrent = true;
    store
      .getState()
      .getFileContent(key)
      .then(
        (content) => {
          const path = store.getState().entries.find((candidate) => candidate.key === key)?.path;
          if (isCurrent && path !== undefined) setRead({ file: { key, path, content }, editor });
        },
        (error: unknown) => {
          if (isCurrent) setRead({ key, error: error instanceof Error ? error : new Error(String(error)), editor });
        },
      );
    return () => {
      isCurrent = false;
    };
  }, [key, editor, store]);

  const path = entry?.path;
  const readKey = read && ('file' in read ? read.file.key : read.key);
  /** Whether the last read is for the open file in its current editor */
  const isUpToDate = readKey !== undefined && readKey === key && read?.editor === editor;

  const shown = useMemo(() => {
    if (!read || !('file' in read)) return undefined;
    // Another file stays shown until the content of the open one arrived
    if (read.file.key !== key) return read.file;
    // The open file in another editor: its content is read again first
    if (read.editor !== editor) return undefined;
    // The open file keeps its content when it moves; only its path changes
    return path !== undefined && read.file.path !== path ? { ...read.file, path } : read.file;
  }, [read, key, path, editor]);

  return {
    shown,
    loading: key !== undefined && !isUpToDate,
    error: isUpToDate && read && 'error' in read ? read.error : undefined,
  };
};
