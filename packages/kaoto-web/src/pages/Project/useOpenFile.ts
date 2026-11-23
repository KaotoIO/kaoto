import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useActiveFile } from '../../hooks/useActiveFile';
import { fileUrl } from '../../routes/file-url';
import { selectEntry } from '../../store/files/files-ui-selectors';
import { FileEntry } from '../../store/files/files-ui-state';
import { useFilesUiStore } from '../../store/files/use-files-ui-store';

const WORKSPACE_PATH = '/workspace';

/**
 * The open file, and the URL kept on it.
 *
 * The URL holds the path of the open file. When the file moves (renamed itself or with a folder above it), the URL
 * follows it, and until it has, the file is still the open one, so that its editor stays. When the file is removed,
 * this leads to the workspace. It only follows once the files are loaded: a failed load or a load with new keys is
 * no removal. A path that never held a file stays in the URL.
 */
export const useOpenFile = (): FileEntry | undefined => {
  const { path, entry: atPath } = useActiveFile();
  const navigate = useNavigate();
  const ready = useFilesUiStore((state) => state.status === 'ready');

  /** The file that was at the path in the URL, to follow it when it moves away */
  const [open, setOpen] = useState<{ key: string; path: string }>();
  if (atPath && (open?.key !== atPath.key || open.path !== atPath.path)) {
    // Adjust state while rendering (https://react.dev/learn/you-might-not-need-an-effect)
    setOpen({ key: atPath.key, path: atPath.path });
  }
  const movedKey = !atPath && open !== undefined && open.path === path ? open.key : undefined;
  const moved = useFilesUiStore((state) => (movedKey === undefined ? undefined : selectEntry(movedKey)(state)));

  useEffect(() => {
    if (!ready || movedKey === undefined) return;
    if (moved) {
      void navigate(fileUrl(moved.path), { replace: true });
    } else {
      void navigate(WORKSPACE_PATH);
    }
  }, [ready, movedKey, moved, navigate]);

  return atPath ?? moved;
};
