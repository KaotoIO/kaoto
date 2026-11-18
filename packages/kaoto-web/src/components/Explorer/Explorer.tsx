// Note: once the REST editor is migrated to kaoto-web, this component should be
// reviewed together with the shared canvas/editor layout (tracked on the parent
// issue) — the file-tree navigation and filtering logic may be consolidated.
import './Explorer.scss';

import { Add, Document, DocumentConfiguration, Folder, FolderOpen, TestTool } from '@carbon/icons-react';
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
import { StoredFile } from '../../services/files/stored-file';
import { CreateFileModal } from '../CreateFileModal/CreateFileModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal/DeleteConfirmModal';
import { ErrorState } from '../ErrorState/ErrorState';
import { buildTree, toFolderPath } from './build-tree';
import { EntryLabel } from './EntryLabel';
import { ExplorerFile } from './explorer-file';
import { filterFiles } from './filterFiles';
import { RenameField } from './RenameField';

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
  requestRename: (fileId: string) => void;
  /** The file being renamed */
  renaming: StoredFile | undefined;
  finishRename: (byKeyboard: boolean) => void;
}

/** The key labelled "delete" on a Mac keyboard sends Backspace */
const DELETE_KEYS: ReadonlySet<string> = new Set(['Delete', 'Backspace']);

/** Delete or Backspace on a tree item asks to delete it, F2 on a file renames it */
function handleEntryKeys(node: ExplorerFile, opts: RenderOptions) {
  return (event: ReactKeyboardEvent) => {
    if (DELETE_KEYS.has(event.key)) {
      // The key event bubbles through the folders around the item
      event.stopPropagation();
      opts.requestDelete(node);
    } else if (event.key === 'F2' && !node.children) {
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
          aria-keyshortcuts="Delete Backspace"
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
  const [query, setQuery] = useState('');
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
    setQuery(e.target.value.toLowerCase());
  }, []);

  const { files, loading, error, reload, deleteFile, deleteFolder } = useFiles();
  const tree = useMemo(() => buildTree(files), [files]);
  const filtered = useMemo(() => filterFiles(tree, query), [tree, query]);

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
  const finishRename = (byKeyboard: boolean) => {
    if (byKeyboard && renamingId) setFocusNode({ nodeId: renamingId });
    setRenamingId(undefined);
  };

  const openCreateModal = (event: React.MouseEvent<HTMLElement>) => {
    createOpenerRef.current = event.currentTarget;
    setIsCreateOpen(true);
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
      </div>

      {/* Section 3 — Search */}
      <div className="cs--explorer__search">
        <Search
          size="sm"
          labelText="Search files"
          placeholder="Search files…"
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
      <div className="cs--explorer__tree" ref={treeRef}>
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
        {!loading && !error && files.length === 0 && (
          <div className="cs--explorer__empty" data-testid="explorer-empty">
            <p>No files yet</p>
            <Button kind="tertiary" size="sm" onClick={openCreateModal}>
              Create…
            </Button>
          </div>
        )}
        {!loading && !error && files.length > 0 && (
          /* enableTreeviewControllable makes `selected` and `active` fully controlled —
             without it, Carbon TreeView only uses `selected` as an initial value and
             won't react to URL changes (e.g. browser back/forward). */
          <FeatureFlags enableTreeviewControllable>
            <TreeView label="Project files" hideLabel selected={selectedId ? [selectedId] : []} active={selectedId}>
              {renderNodes(filtered, {
                query,
                selectedId,
                expandedFolders,
                handleToggle,
                openIntegration,
                requestDelete: setNodeToDelete,
                requestRename: setRenamingId,
                renaming,
                finishRename,
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
