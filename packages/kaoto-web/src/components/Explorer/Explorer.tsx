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
import { Button, FeatureFlags, IconButton, Search, SkeletonText, TreeNode, TreeView } from '@carbon/react';
import {
  ChangeEvent,
  ComponentProps,
  FunctionComponent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router';

import { useFiles } from '../../hooks/useFiles';
import { getFileType, StoredFile } from '../../services/files/stored-file';
import { CreateFileModal } from '../CreateFileModal/CreateFileModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal/DeleteConfirmModal';
import { ErrorState } from '../ErrorState/ErrorState';
import { buildTree, toFolderId, toFolderPath } from './build-tree';
import { EntryLabel } from './EntryLabel';
import { ExplorerFile } from './explorer-file';
import { filterFiles } from './filterFiles';
import { moveExpandedFolders } from './move-expanded-folders';
import { CreatedEntry, NewEntryField, NewEntryKind } from './NewEntryField';
import { RenameField } from './RenameField';
import { RenameFolderField } from './RenameFolderField';

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

interface RenderOptions {
  query: string;
  selectedId: string | undefined;
  expandedFolders: Record<string, boolean>;
  handleToggle: (folderId: string) => ComponentProps<typeof TreeNode>['onToggle'];
  openIntegration: (fileId: string) => void;
  requestDelete: (node: ExplorerFile) => void;
  /** Starts renaming the file or folder with the tree node id */
  requestRename: (nodeId: string) => void;
  /** The file being renamed */
  renaming: StoredFile | undefined;
  /** The path of the folder being renamed */
  renamingFolder: string | undefined;
  finishRename: (byKeyboard: boolean, renamedNodeId?: string) => void;
  /** Moves the expansion state along with a folder renamed in storage */
  moveExpanded: (fromPath: string, toPath: string) => void;
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

/** Stands for the root in the last focused tree item, after a click on the free space of the tree */
const ROOT_TARGET = 'root:';

/** Puts the node of the new entry into its folder: a folder first among the folders, a file first among the files */
function insertNewEntry(nodes: ExplorerFile[], entry: NewEntry): ExplorerFile[] {
  const node: ExplorerFile = { id: NEW_ENTRY_ID, name: '', type: entry.kind === 'folder' ? 'folder' : 'document' };
  const insert = (siblings: ExplorerFile[]) => {
    const index = entry.kind === 'folder' ? 0 : siblings.findIndex((sibling) => !sibling.children);
    const at = index === -1 ? siblings.length : index;
    return [...siblings.slice(0, at), node, ...siblings.slice(at)];
  };
  if (!entry.folderPath) return insert(nodes);

  const folderId = toFolderId(entry.folderPath);
  return nodes.map((candidate) => {
    if (!candidate.children) return candidate;
    if (candidate.id === folderId) return { ...candidate, children: insert(candidate.children) };
    if (entry.folderPath.startsWith(`${toFolderPath(candidate.id)}/`)) {
      return { ...candidate, children: insertNewEntry(candidate.children, entry) };
    }
    return candidate;
  });
}

/** Whether the tree node id is the id of a folder */
const isFolderId = (id: string): boolean => toFolderId(toFolderPath(id)) === id;

/** The folder paths from the outermost folder down to the folder itself */
const folderAndParents = (folderPath: string): string[] =>
  folderPath ? folderPath.split('/').map((_, index, segments) => segments.slice(0, index + 1).join('/')) : [];

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
  if (opts.renaming?.id === node.id) {
    return <RenameField file={opts.renaming} onDone={opts.finishRename} />;
  }
  if (opts.renamingFolder !== undefined && node.children && toFolderPath(node.id) === opts.renamingFolder) {
    return (
      <RenameFolderField
        folderPath={opts.renamingFolder}
        onDone={(byKeyboard, renamedPath) => {
          opts.finishRename(byKeyboard, renamedPath === undefined ? undefined : toFolderId(renamedPath));
        }}
        onRenamed={opts.moveExpanded}
      />
    );
  }
  return (
    <EntryLabel node={node} query={opts.query} requestDelete={opts.requestDelete} requestRename={opts.requestRename} />
  );
}

const OPENABLE_TYPES: ReadonlySet<ExplorerFile['type']> = new Set(['integration', 'integration-test']);

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
          data-testid={`explorer-folder-${toFolderPath(node.id)}`}
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
        data-testid={`explorer-file-${node.id}`}
        onKeyDown={handleEntryKeys(node, opts)}
        aria-keyshortcuts="F2 Delete Backspace"
        onSelect={() => {
          if (OPENABLE_TYPES.has(node.type)) opts.openIntegration(node.id);
        }}
      />
    );
  });
}

export const Explorer: FunctionComponent = () => {
  const { fileId: selectedId } = useParams();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const query = searchText.toLowerCase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<ExplorerFile>();
  const [renamingId, setRenamingId] = useState<string>();
  const treeRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  /** The button that opened the Create New File modal */
  const createOpenerRef = useRef<HTMLElement | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(DEFAULT_WIDTH);
  // widthRef mirrors the width state so handleResizerMouseDown can read the
  // current value in a mousedown handler without taking width as a dependency
  // (which would recreate the callback on every mousemove during a drag).
  const widthRef = useRef<number>(DEFAULT_WIDTH);
  useLayoutEffect(() => {
    widthRef.current = width;
  });

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX;
    startWidth.current = widthRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const { files, folders, loading, error, reload, deleteFile, deleteFolder } = useFiles();
  const tree = useMemo(() => buildTree(files, folders), [files, folders]);
  const filtered = useMemo(() => filterFiles(tree, query), [tree, query]);

  const [newEntry, setNewEntry] = useState<NewEntry>();
  const nodes = useMemo(() => (newEntry ? insertNewEntry(filtered, newEntry) : filtered), [filtered, newEntry]);
  /**
   * The tree item that had the focus last, as clicking a toolbar button takes the focus away from it, with the file
   * that was open then: once another file opens from outside the tree, the open file decides the folder instead.
   */
  const lastFocusedNodeRef = useRef<{ nodeId: string; openFileId: string | undefined } | undefined>(undefined);

  const handleToggle = useCallback(
    (folderId: string) =>
      // With enableTreeviewControllable, Carbon calls onToggle(isExpanded) rather than (event, node).
      ((newIsExpanded: boolean) => {
        setExpandedFolders((prev) => ({ ...prev, [folderId]: newIsExpanded }));
      }) as ComponentProps<typeof TreeNode>['onToggle'],
    [],
  );

  const openIntegration = useCallback(
    (fileId: string) => {
      void navigate(`/workspace/file/${fileId}`);
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

  const renaming = renamingId ? files.find((file) => file.id === renamingId) : undefined;
  const renamingFolder = renamingId && isFolderId(renamingId) ? toFolderPath(renamingId) : undefined;
  /** The folder ids follow the paths, so a renamed folder and its subfolders stay expanded under their new ids */
  const moveExpanded = useCallback((fromPath: string, toPath: string) => {
    setExpandedFolders((previous) => moveExpandedFolders(previous, fromPath, toPath));
  }, []);
  const finishRename = (byKeyboard: boolean, renamedNodeId?: string) => {
    const nodeId = renamedNodeId ?? renamingId;
    if (byKeyboard && nodeId) setFocusNode({ nodeId });
    setRenamingId(undefined);
  };

  const openCreateModal = (event: React.MouseEvent<HTMLElement>) => {
    createOpenerRef.current = event.currentTarget;
    setIsCreateOpen(true);
  };

  /** The folder a new entry goes into: the last focused tree item's, else the open file's, else the root */
  const targetFolderPath = (): string => {
    const folderOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0));
    const focused = lastFocusedNodeRef.current;
    const lastFocused = focused?.openFileId === selectedId ? focused?.nodeId : undefined;
    if (lastFocused === ROOT_TARGET) return '';
    if (lastFocused && isFolderId(lastFocused)) {
      const folderPath = toFolderPath(lastFocused);
      // Every folder is stored, so a folder that was renamed or deleted since is gone from the list
      if (folders.includes(folderPath)) return folderPath;
    }
    const file = files.find(({ id }) => id === lastFocused) ?? files.find(({ id }) => id === selectedId);
    return file ? folderOf(file.path) : '';
  };

  const startCreate = (kind: NewEntryKind, event: React.MouseEvent<HTMLElement>) => {
    const opener = event.currentTarget;
    const folderPath = targetFolderPath();
    // The search would hide the new entry
    setSearchText('');
    setExpandedFolders((previous) => ({
      ...previous,
      ...Object.fromEntries(folderAndParents(folderPath).map((path) => [toFolderId(path), true])),
    }));
    setNewEntry((previous) => ({ kind, folderPath, key: (previous?.key ?? 0) + 1, opener }));
  };

  const finishCreate = (byKeyboard: boolean, created: CreatedEntry | undefined) => {
    setNewEntry(undefined);
    if (!created) {
      if (byKeyboard) newEntry?.opener.focus();
      return;
    }
    if (byKeyboard) setFocusNode({ nodeId: created.id });
    if (!isFolderId(created.id) && OPENABLE_TYPES.has(getFileType(created.path))) openIntegration(created.id);
  };

  /**
   * The element to focus once the Create New File modal is closed. The modal unmounts on close, so focus goes back by
   * hand: to the button that opened it, or to the toolbar button when that one is gone, as the empty-state button is
   * once a file exists. An object, so that every close focuses again.
   */
  const [focusAfterCreate, setFocusAfterCreate] = useState<{ opener: HTMLElement | null }>();
  useEffect(() => {
    if (!focusAfterCreate) return;
    const { opener } = focusAfterCreate;
    (opener?.isConnected ? opener : addButtonRef.current)?.focus();
  }, [focusAfterCreate]);

  const deleteNode = async (node: ExplorerFile) => {
    const openPath = files.find((file) => file.id === selectedId)?.path;
    let deletesOpenFile;
    if (node.children) {
      const folderPath = toFolderPath(node.id);
      await deleteFolder(folderPath);
      deletesOpenFile = !!openPath?.startsWith(`${folderPath}/`);
    } else {
      await deleteFile(node.id);
      deletesOpenFile = node.id === selectedId;
    }
    if (deletesOpenFile) void navigate('/workspace');
  };

  return (
    <aside
      className="cs--explorer"
      data-testid="explorer"
      aria-label="Project explorer"
      style={{ inlineSize: `${width}px` }}
    >
      {/* Section 1 — Route selector area (stub) */}
      <div className="cs--explorer__route-selector" data-testid="route-selector-area" />

      {/* Section 2 — Toolbar */}
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

      {/* Section 3 — Search */}
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
      <button
        className="cs--explorer__resizer"
        aria-label="Resize explorer panel"
        onMouseDown={handleResizerMouseDown}
      />

      {/* Section 4 — File tree */}
      {/* A click on the free space below the items makes the root the folder of the next new file or folder */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="cs--explorer__tree"
        ref={treeRef}
        data-testid="explorer-tree"
        onMouseDown={(event) => {
          if (!(event.target as HTMLElement).closest('[role="treeitem"]')) {
            lastFocusedNodeRef.current = { nodeId: ROOT_TARGET, openFileId: selectedId };
          }
        }}
        onFocus={(event) => {
          const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
          if (item?.id && item.id !== NEW_ENTRY_ID)
            lastFocusedNodeRef.current = { nodeId: item.id, openFileId: selectedId };
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
            onRetry={reload}
          />
        )}
        {!loading && !error && tree.length === 0 && !newEntry && (
          <div className="cs--explorer__empty" data-testid="explorer-empty">
            <p>No files yet</p>
            <Button kind="tertiary" size="sm" onClick={openCreateModal}>
              Create…
            </Button>
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
                openIntegration,
                requestDelete: setNodeToDelete,
                requestRename: setRenamingId,
                renaming,
                renamingFolder,
                finishRename,
                moveExpanded,
                newEntry,
                finishCreate,
              })}
            </TreeView>
          </FeatureFlags>
        )}
      </div>
      {isCreateOpen && (
        <CreateFileModal
          onClose={() => {
            setIsCreateOpen(false);
            setFocusAfterCreate({ opener: createOpenerRef.current });
          }}
        />
      )}
      {nodeToDelete && (
        <DeleteConfirmModal
          heading={nodeToDelete.children ? 'Delete folder?' : 'Delete file?'}
          onDelete={() => deleteNode(nodeToDelete)}
          onClose={() => {
            setNodeToDelete(undefined);
            setFocusNode({ nodeId: nodeToDelete.id });
          }}
        >
          {nodeToDelete.children ? (
            <>
              Are you sure you want to delete the folder <strong>{nodeToDelete.name}</strong> and all its contents?
            </>
          ) : (
            <>
              Are you sure you want to delete <strong>{nodeToDelete.name}</strong>?
            </>
          )}
        </DeleteConfirmModal>
      )}
    </aside>
  );
};
