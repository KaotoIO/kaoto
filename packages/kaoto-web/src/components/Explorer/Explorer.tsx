// Note: once the REST editor is migrated to kaoto-web, this component should be
// reviewed together with the shared canvas/editor layout (tracked on the parent
// issue) — the file-tree navigation and filtering logic may be consolidated.
import './Explorer.scss';

import { Add, DocumentAdd, FolderAdd } from '@carbon/icons-react';
import { IconButton, Link, Search, SkeletonText } from '@carbon/react';
import { ChangeEvent, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useActiveFile } from '../../hooks/useActiveFile';
import { fileUrl } from '../../routes/file-url';
import { parentFolderOf } from '../../services/files/file-path';
import { FileEntry } from '../../store/files/files-ui-state';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { CreateFileModal } from '../CreateFileModal/CreateFileModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal/DeleteConfirmModal';
import { ErrorState } from '../ErrorState/ErrorState';
import { buildTree } from './build-tree';
import { ExplorerFile } from './explorer-file';
import { ExplorerActions, NEW_ENTRY_ROW_ID } from './ExplorerEntry';
import { ExplorerTree, ExplorerTreeHandle } from './ExplorerTree';
import { getFolderKeysOnPath } from './folder-keys-on-path';
import { getFolderPathForNewEntry, ROOT_TARGET } from './folder-path-for-new-entry';
import { CreatedEntry, NewEntryKind } from './NewEntryField';
import { getVisibleRows } from './visible-rows';

interface NewEntry {
  kind: NewEntryKind;
  /** The folder it is created in, empty for the root */
  folderPath: string;
  /**
   * Unique while the Explorer is mounted, also after the field closed, so that a new start mounts a new field and a
   * late report of an earlier field never matches the field open now
   */
  key: number;
  /** The button that started creating, to focus again when creating is cancelled with Escape */
  opener: HTMLElement;
}

interface ExplorerProps {
  /**
   * Starts resizing the panel when its resize handle is pressed. The width itself is the CSS variable
   * `--cs-explorer-inline-size`, see `useExplorerWidth`.
   */
  onResizerMouseDown: (event: React.MouseEvent) => void;
}

export const Explorer: FunctionComponent<ExplorerProps> = ({ onResizerMouseDown }) => {
  const selectedId = useActiveFile().entry?.key;
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const query = searchText.toLowerCase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  /** The entry the delete confirmation asks about, with its path taken when it was asked for */
  const [toDelete, setToDelete] = useState<{ node: ExplorerFile; path: string }>();
  const [renamingId, setRenamingId] = useState<string>();
  const treeHandleRef = useRef<ExplorerTreeHandle>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  /** The button that opened the Create New File modal */
  const createOpenerRef = useRef<HTMLElement | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  /** Expands the folders, leaving the others as they are */
  const expandFolders = (folderKeys: string[]) => {
    setExpandedFolders((previous) => ({ ...previous, ...Object.fromEntries(folderKeys.map((key) => [key, true])) }));
  };

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const store = useFilesUiStoreApi();
  const entries = useFilesUiStore((state) => state.entries);
  const loading = useFilesUiStore((state) => state.status === 'loading');
  const error = useFilesUiStore((state) => state.error);
  const tree = useMemo(() => buildTree(entries), [entries]);

  /**
   * Unfolds the folders down to a file whenever another file opens, also from outside the tree: the Create new file
   * dialog, the URL or a reload. Only then, so that a folder of the open file the user collapses stays collapsed.
   */
  const [revealedId, setRevealedId] = useState(selectedId);
  if (revealedId !== selectedId) {
    setRevealedId(selectedId);
    const openPath = entries.find(({ key }) => key === selectedId)?.path;
    if (openPath) expandFolders(getFolderKeysOnPath(entries, parentFolderOf(openPath)));
  }

  const [newEntry, setNewEntry] = useState<NewEntry>();
  /**
   * The name fields open now, read when a store finishes: by then the field that started it may have unmounted, or
   * another field may have taken its place, which the late report must not close
   */
  const openFieldsRef = useRef<{ renamingId?: string; newEntryKey?: number }>({});
  useEffect(
    function rememberOpenFields() {
      openFieldsRef.current = { renamingId, newEntryKey: newEntry?.key };
    },
    [renamingId, newEntry],
  );
  const renaming = renamingId ? entries.find((entry) => entry.key === renamingId) : undefined;
  const renamingPath = renaming?.path;
  const rows = useMemo(
    () => getVisibleRows(tree, { expandedFolders, query, newEntry, renamingPath }),
    [tree, expandedFolders, query, newEntry, renamingPath],
  );
  /**
   * The row focused last, kept here for both its uses, each with its own rule:
   * - the tab stop of the tree, `focusedRowId`: Tab comes back to that row while it is shown;
   * - the folder of the next new file or folder, `lastFocusedNodeRef`, as clicking a toolbar button takes the focus away
   *   from the row. It is forgotten whenever another file opens, also from outside the tree and when coming back to the
   *   file it was remembered with: the open file decides the folder then. A click on the free space below the rows
   *   makes it the root.
   */
  const [focusedRowId, setFocusedRowId] = useState<string>();
  const lastFocusedNodeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    lastFocusedNodeRef.current = undefined;
  }, [selectedId]);
  const rememberFocusedRow = useCallback((rowId: string) => {
    setFocusedRowId(rowId);
    lastFocusedNodeRef.current = rowId;
  }, []);

  const toggleFolder = useCallback((folderId: string, isExpanded: boolean) => {
    setExpandedFolders((previous) => ({ ...previous, [folderId]: isExpanded }));
  }, []);

  const openFile = useCallback(
    (node: Pick<ExplorerFile, 'path'>) => {
      void navigate(fileUrl(node.path));
    },
    [navigate],
  );

  /**
   * The node to focus once the delete modal or the rename field is closed. They unmount on close, so focus goes back by
   * hand: to the node, or to the tree when the node is deleted. An object, so that every close focuses again.
   */
  const [focusNode, setFocusNode] = useState<{ nodeId: string }>();
  useEffect(() => {
    if (!focusNode) return;
    const tree = treeHandleRef.current;
    if (tree?.focusRow(focusNode.nodeId) || tree?.focusFirstRow()) return;
    addButtonRef.current?.focus();
  }, [focusNode]);

  /**
   * Scrolls the name field of a new entry, or of the entry being renamed, into view: only the rows in view are
   * rendered, and the field focuses itself once it is.
   */
  useEffect(
    function scrollNameFieldIntoView() {
      const fieldRowId = newEntry ? NEW_ENTRY_ROW_ID : renamingId;
      if (fieldRowId) treeHandleRef.current?.scrollToRow(fieldRowId);
    },
    [newEntry, renamingId],
  );

  /** A renamed entry keeps its key, so it stays expanded and is focused again by the same id */
  const finishRename = (entryKey: string, byKeyboard: boolean) => {
    if (openFieldsRef.current.renamingId !== entryKey) return;
    if (byKeyboard) setFocusNode({ nodeId: entryKey });
    setRenamingId(undefined);
  };

  const openCreateModal = (event: React.MouseEvent<HTMLElement>) => {
    createOpenerRef.current = event.currentTarget;
    setIsCreateOpen(true);
  };

  /** The key of the last new entry started, see NewEntry.key */
  const newEntryKeyRef = useRef(0);
  const startCreate = (kind: NewEntryKind, event: React.MouseEvent<HTMLElement>) => {
    const opener = event.currentTarget;
    const folderPath = getFolderPathForNewEntry(entries, lastFocusedNodeRef.current, selectedId);
    // The search would hide the new entry
    setSearchText('');
    expandFolders(getFolderKeysOnPath(entries, folderPath));
    newEntryKeyRef.current += 1;
    setNewEntry({ kind, folderPath, key: newEntryKeyRef.current, opener });
  };

  const finishCreate = (fieldKey: number, byKeyboard: boolean, created: CreatedEntry | undefined) => {
    if (openFieldsRef.current.newEntryKey !== fieldKey) return;
    setNewEntry(undefined);
    if (!created) {
      if (byKeyboard) newEntry?.opener.focus();
      return;
    }
    if (byKeyboard) setFocusNode({ nodeId: created.id });
    if (newEntry?.kind === 'file') openFile(created);
  };

  /**
   * The element to focus once the Create New File modal is cancelled. The modal unmounts on close, so focus goes back by
   * hand: to the button that opened it, or to the toolbar button when that one is gone, as the empty-state button is
   * once a file exists. An object, so that every close focuses again.
   */
  const [focusAfterCreate, setFocusAfterCreate] = useState<{ opener: HTMLElement | null }>();
  useEffect(() => {
    if (!focusAfterCreate) return;
    const { opener } = focusAfterCreate;
    (opener?.isConnected ? opener : addButtonRef.current)?.focus();
  }, [focusAfterCreate]);

  /**
   * Focuses the file the modal created, where the tree shows it selected, or the button that opened the modal when it
   * was cancelled. The search is cleared and the folders of the file are unfolded, so that its tree item shows.
   */
  const handleCreateModalClose = (created?: FileEntry) => {
    setIsCreateOpen(false);
    if (!created) {
      setFocusAfterCreate({ opener: createOpenerRef.current });
      return;
    }
    setSearchText('');
    // Unfolded here and not left to `revealedId`: the router opens the file in a transition, which renders after the
    // focus moves. The entries come from the store, as the folders of the file may be newer than this render's.
    expandFolders(getFolderKeysOnPath(store.getState().entries, parentFolderOf(created.path)));
    setFocusNode({ nodeId: created.key });
  };

  /**
   * Asks to delete a node. The confirmation names its full path, so that the user can tell entries of the same name
   * in different folders apart. The path is taken now, while the node is still in the tree.
   */
  const requestDelete = (node: ExplorerFile) => {
    setToDelete({ node, path: node.path });
  };

  /** The open file leads to the workspace on its own once it is gone, see `useOpenFile` */
  const deleteNode = (node: ExplorerFile) =>
    node.children ? store.getState().removeFolder(node.id) : store.getState().removeFile(node.id);

  const actions: ExplorerActions = {
    openFile,
    toggleFolder,
    requestRename: setRenamingId,
    requestDelete,
    finishRename,
    finishCreate,
  };

  return (
    <aside className="cs--explorer" data-testid="explorer" aria-label="Project explorer">
      {/* Section 1 — Toolbar */}
      <div className="cs--explorer__toolbar">
        <h2 className="cs--explorer__heading">Explorer</h2>
        <div className="cs--explorer__toolbar-actions">
          <IconButton
            label="Create a file"
            kind="ghost"
            size="sm"
            align="bottom-start"
            data-testid="explorer-add"
            ref={addButtonRef}
            onClick={openCreateModal}
          >
            <Add />
          </IconButton>
          <IconButton
            label="New file"
            kind="ghost"
            size="sm"
            align="bottom"
            data-testid="explorer-new-file"
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              startCreate('file', event);
            }}
          >
            <DocumentAdd />
          </IconButton>
          <IconButton
            label="New folder"
            kind="ghost"
            size="sm"
            align="bottom"
            data-testid="explorer-new-folder"
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              startCreate('folder', event);
            }}
          >
            <FolderAdd />
          </IconButton>
        </div>
      </div>

      {/* Section 2 — Search */}
      <div className="cs--explorer__search">
        <Search
          size="sm"
          labelText="Search files"
          placeholder="Search files…"
          value={searchText}
          onChange={handleSearch}
          data-testid="explorer-search"
        />
      </div>

      {/* Resize handle */}
      <button className="cs--explorer__resizer" aria-label="Resize explorer panel" onMouseDown={onResizerMouseDown} />

      {/* Section 3 — File tree */}
      {/* A click on the free space below the items makes the root the folder of the next new file or folder */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="cs--explorer__tree"
        data-testid="explorer-tree"
        onMouseDown={(event) => {
          if (!(event.target as HTMLElement).closest('[role="treeitem"]')) {
            lastFocusedNodeRef.current = ROOT_TARGET;
          }
        }}
      >
        {loading && (
          <div data-testid="explorer-loading">
            <SkeletonText paragraph lineCount={4} />
          </div>
        )}
        {error && (
          <ErrorState
            title="Could not load the files"
            message={`Kaoto keeps the files in the browser storage, and the browser storage may be blocked, for example in a private window. (${error.message})`}
            onRetry={() => {
              void store.getState().load();
            }}
          />
        )}
        {!loading && !error && tree.length === 0 && !newEntry && (
          <div className="cs--explorer__empty" data-testid="explorer-empty">
            {/* A link to the eye, but it opens the Create new file modal rather than going anywhere */}
            <Link as="button" type="button" className="cs--explorer__create-first" onClick={openCreateModal}>
              Create your first file…
            </Link>
          </div>
        )}
        {!loading && !error && (tree.length > 0 || newEntry) && (
          <ExplorerTree
            ref={treeHandleRef}
            rows={rows}
            openFileKey={selectedId}
            focusedRowId={focusedRowId}
            onRowFocus={rememberFocusedRow}
            query={query}
            renaming={renaming}
            actions={actions}
          />
        )}
      </div>
      {isCreateOpen && <CreateFileModal onClose={handleCreateModalClose} />}
      {toDelete && (
        <DeleteConfirmModal
          heading={toDelete.node.children ? 'Delete folder?' : 'Delete file?'}
          onDelete={() => deleteNode(toDelete.node)}
          onClose={() => {
            setToDelete(undefined);
            setFocusNode({ nodeId: toDelete.node.id });
          }}
        >
          {toDelete.node.children ? (
            <>
              Are you sure you want to delete the folder <strong>{toDelete.path}</strong> and all its contents?
            </>
          ) : (
            <>
              Are you sure you want to delete <strong>{toDelete.path}</strong>?
            </>
          )}
        </DeleteConfirmModal>
      )}
    </aside>
  );
};
