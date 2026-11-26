// Note: once the REST editor is migrated to kaoto-web, this component should be
// reviewed together with the shared canvas/editor layout (tracked on the parent
// issue) — the file-tree navigation and filtering logic may be consolidated.
import './Explorer.scss';

import {
  Add,
  Document,
  DocumentAdd,
  DocumentConfiguration,
  Folder,
  FolderAdd,
  FolderOpen,
  TestTool,
} from '@carbon/icons-react';
import { FeatureFlags, IconButton, Link, Search, SkeletonText, TreeNode, TreeView } from '@carbon/react';
import {
  ChangeEvent,
  ComponentProps,
  FunctionComponent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { EntryLabel } from './EntryLabel';
import { ExplorerFile } from './explorer-file';
import { filterFiles } from './filterFiles';
import { getFolderKeysOnPath } from './folder-keys-on-path';
import { getFolderPathForNewEntry, ROOT_TARGET } from './folder-path-for-new-entry';
import { CreatedEntry, NewEntryField, NewEntryKind } from './NewEntryField';
import { RenameField } from './RenameField';
import { RenameFolderField } from './RenameFolderField';

interface RenderOptions {
  query: string;
  selectedId: string | undefined;
  expandedFolders: Record<string, boolean>;
  handleToggle: (folderId: string) => ComponentProps<typeof TreeNode>['onToggle'];
  /** Opens a file in the editor of its type */
  openFile: (node: ExplorerFile) => void;
  requestDelete: (node: ExplorerFile) => void;
  /** Starts renaming the file or folder with the tree node id */
  requestRename: (nodeId: string) => void;
  /** The file or folder being renamed */
  renaming: FileEntry | undefined;
  finishRename: (byKeyboard: boolean) => void;
  /** The file or folder being created */
  newEntry: NewEntry | undefined;
  finishCreate: (byKeyboard: boolean, created: CreatedEntry | undefined) => void;
}

interface NewEntry {
  kind: NewEntryKind;
  /** The folder it is created in, empty for the root */
  folderPath: string;
  /** Changes with every start, so that a new start mounts a new field */
  key: number;
  /** The button that started creating, to focus again when creating is cancelled with Escape */
  opener: HTMLElement;
}

/** The id of the tree node that holds the name field of a new file or folder */
const NEW_ENTRY_ID = 'new-entry:';

/** Puts the node of the new entry into its folder: a folder first among the folders, a file first among the files */
function insertNewEntry(nodes: ExplorerFile[], entry: NewEntry): ExplorerFile[] {
  const node: ExplorerFile = {
    id: NEW_ENTRY_ID,
    path: '',
    name: '',
    type: entry.kind === 'folder' ? 'folder' : 'document',
  };
  const insert = (siblings: ExplorerFile[]) => {
    const index = entry.kind === 'folder' ? 0 : siblings.findIndex((sibling) => !sibling.children);
    const at = index === -1 ? siblings.length : index;
    return [...siblings.slice(0, at), node, ...siblings.slice(at)];
  };
  if (!entry.folderPath) return insert(nodes);

  return nodes.map((candidate) => {
    if (!candidate.children) return candidate;
    if (candidate.path === entry.folderPath) return { ...candidate, children: insert(candidate.children) };
    if (entry.folderPath.startsWith(`${candidate.path}/`)) {
      return { ...candidate, children: insertNewEntry(candidate.children, entry) };
    }
    return candidate;
  });
}

/** The key labelled "delete" on a Mac keyboard sends Backspace */
const DELETE_KEYS: ReadonlySet<string> = new Set(['Delete', 'Backspace']);

/** Delete or Backspace on a tree item asks to delete it, F2 renames it */
function handleEntryKeys(node: ExplorerFile, opts: RenderOptions) {
  return (event: ReactKeyboardEvent) => {
    if (DELETE_KEYS.has(event.key)) {
      // The key event bubbles through the folders around the item
      event.stopPropagation();
      opts.requestDelete(node);
    } else if (event.key === 'F2') {
      event.stopPropagation();
      event.preventDefault();
      opts.requestRename(node.id);
    }
  };
}

function renderEntryLabel(node: ExplorerFile, opts: RenderOptions): React.ReactNode {
  if (opts.renaming?.key === node.id) {
    return opts.renaming.kind === 'folder' ? (
      <RenameFolderField folder={opts.renaming} onDone={opts.finishRename} />
    ) : (
      <RenameField file={opts.renaming} onDone={opts.finishRename} />
    );
  }
  return (
    <EntryLabel node={node} query={opts.query} requestDelete={opts.requestDelete} requestRename={opts.requestRename} />
  );
}

function getFileIcon(type: ExplorerFile['type']) {
  if (type === 'integration') return DocumentConfiguration;
  if (type === 'integration-test') return TestTool;
  return Document;
}

function renderNodes(nodes: ExplorerFile[], opts: RenderOptions): React.ReactNode[] {
  return nodes.map((node) => {
    if (node.id === NEW_ENTRY_ID && opts.newEntry) {
      return (
        <TreeNode
          key={`${NEW_ENTRY_ID}${opts.newEntry.key}`}
          id={NEW_ENTRY_ID}
          label={
            <NewEntryField kind={opts.newEntry.kind} folderPath={opts.newEntry.folderPath} onDone={opts.finishCreate} />
          }
          renderIcon={opts.newEntry.kind === 'folder' ? Folder : Document}
          data-testid="explorer-new-entry"
        />
      );
    }
    const isExpanded = opts.query ? true : !!opts.expandedFolders[node.id];
    if (node.children) {
      return (
        <TreeNode
          key={node.id}
          id={node.id}
          label={renderEntryLabel(node, opts)}
          renderIcon={isExpanded ? FolderOpen : Folder}
          isExpanded={isExpanded}
          onToggle={opts.handleToggle(node.id)}
          onKeyDown={handleEntryKeys(node, opts)}
          aria-keyshortcuts="F2 Delete Backspace"
          data-testid={`explorer-folder-${node.path}`}
        >
          {renderNodes(node.children, opts)}
        </TreeNode>
      );
    }
    return (
      <TreeNode
        key={node.id}
        id={node.id}
        label={renderEntryLabel(node, opts)}
        renderIcon={getFileIcon(node.type)}
        data-testid={`explorer-file-${node.path}`}
        onKeyDown={handleEntryKeys(node, opts)}
        aria-keyshortcuts="F2 Delete Backspace"
        onSelect={() => {
          opts.openFile(node);
        }}
      />
    );
  });
}

interface ExplorerProps {
  /** The width of the panel in pixels, see {@link useExplorerWidth} */
  width: number;
  /** Starts resizing the panel when its resize handle is pressed */
  onResizerMouseDown: (event: React.MouseEvent) => void;
}

export const Explorer: FunctionComponent<ExplorerProps> = ({ width, onResizerMouseDown }) => {
  const selectedId = useActiveFile().entry?.key;
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const query = searchText.toLowerCase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  /** The entry the delete confirmation asks about, with its path taken when it was asked for */
  const [toDelete, setToDelete] = useState<{ node: ExplorerFile; path: string }>();
  const [renamingId, setRenamingId] = useState<string>();
  const treeRef = useRef<HTMLDivElement>(null);
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
  const filtered = useMemo(() => filterFiles(tree, query), [tree, query]);

  const [newEntry, setNewEntry] = useState<NewEntry>();
  const nodes = useMemo(() => (newEntry ? insertNewEntry(filtered, newEntry) : filtered), [filtered, newEntry]);
  /**
   * The tree item that had the focus last, as clicking a toolbar button takes the focus away from it. Forgotten whenever
   * another file opens, also from outside the tree and when coming back to the file it was remembered with: the open
   * file decides the folder then.
   */
  const lastFocusedNodeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    lastFocusedNodeRef.current = undefined;
  }, [selectedId]);

  const handleToggle = useCallback(
    (folderId: string) =>
      // With enableTreeviewControllable, Carbon calls onToggle(isExpanded) rather than (event, node).
      ((newIsExpanded: boolean) => {
        setExpandedFolders((prev) => ({ ...prev, [folderId]: newIsExpanded }));
      }) as ComponentProps<typeof TreeNode>['onToggle'],
    [],
  );

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
    const items = [...(treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])];
    const target = items.find((item) => item.id === focusNode.nodeId) ?? items[0] ?? addButtonRef.current;
    target?.focus();
  }, [focusNode]);

  const renaming = renamingId ? entries.find((entry) => entry.key === renamingId) : undefined;
  /** A renamed entry keeps its key, so it stays expanded and is focused again by the same id */
  const finishRename = (byKeyboard: boolean) => {
    if (byKeyboard && renamingId) setFocusNode({ nodeId: renamingId });
    setRenamingId(undefined);
  };

  const openCreateModal = (event: React.MouseEvent<HTMLElement>) => {
    createOpenerRef.current = event.currentTarget;
    setIsCreateOpen(true);
  };

  const startCreate = (kind: NewEntryKind, event: React.MouseEvent<HTMLElement>) => {
    const opener = event.currentTarget;
    const folderPath = getFolderPathForNewEntry(entries, lastFocusedNodeRef.current, selectedId);
    // The search would hide the new entry
    setSearchText('');
    expandFolders(getFolderKeysOnPath(entries, folderPath));
    setNewEntry((previous) => ({ kind, folderPath, key: (previous?.key ?? 0) + 1, opener }));
  };

  const finishCreate = (byKeyboard: boolean, created: CreatedEntry | undefined) => {
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

  return (
    <aside
      className="cs--explorer"
      data-testid="explorer"
      aria-label="Project explorer"
      style={{ inlineSize: `${width}px` }}
    >
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
        ref={treeRef}
        data-testid="explorer-tree"
        onMouseDown={(event) => {
          if (!(event.target as HTMLElement).closest('[role="treeitem"]')) {
            lastFocusedNodeRef.current = ROOT_TARGET;
          }
        }}
        onFocus={(event) => {
          const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
          if (item?.id && item.id !== NEW_ENTRY_ID) lastFocusedNodeRef.current = item.id;
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
          /* enableTreeviewControllable makes `selected` and `active` fully controlled —
             without it, Carbon TreeView only uses `selected` as an initial value and
             won't react to URL changes (e.g. browser back/forward). */
          <FeatureFlags enableTreeviewControllable>
            <TreeView label="Project files" hideLabel selected={selectedId ? [selectedId] : []} active={selectedId}>
              {renderNodes(nodes, {
                query,
                selectedId,
                expandedFolders,
                handleToggle,
                openFile,
                requestDelete,
                requestRename: setRenamingId,
                renaming,
                finishRename,
                newEntry,
                finishCreate,
              })}
            </TreeView>
          </FeatureFlags>
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
