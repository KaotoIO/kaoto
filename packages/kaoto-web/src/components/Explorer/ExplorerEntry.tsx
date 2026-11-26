import { CaretDown, Document, DocumentConfiguration, Folder, FolderOpen, TestTool } from '@carbon/icons-react';
import { CSSProperties, FunctionComponent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

import { FileEntry } from '../../store/files/files-ui-state';
import { EntryLabel } from './EntryLabel';
import { ExplorerFile } from './explorer-file';
import { CreatedEntry, NewEntryField } from './NewEntryField';
import { RenameField } from './RenameField';
import { RenameFolderField } from './RenameFolderField';
import { ExplorerRow } from './visible-rows';

/** What the rows of the Explorer tree can ask the Explorer to do */
export interface ExplorerActions {
  /** Opens a file in the editor of its type */
  openFile: (node: Pick<ExplorerFile, 'path'>) => void;
  toggleFolder: (folderId: string, isExpanded: boolean) => void;
  /** Starts renaming the file or folder with the tree node id */
  requestRename: (nodeId: string) => void;
  requestDelete: (node: ExplorerFile) => void;
  /** Closes the rename field of the entry with the key, unless another field has taken its place */
  finishRename: (entryKey: string, byKeyboard: boolean) => void;
  /** Closes the new entry field with the key, unless another field has taken its place */
  finishCreate: (fieldKey: number, byKeyboard: boolean, created: CreatedEntry | undefined) => void;
}

interface ExplorerEntryProps {
  row: ExplorerRow;
  /** Whether the row is the file open in the editor */
  isOpenFile: boolean;
  /** Whether the row is the one tree item that Tab reaches */
  isTabStop: boolean;
  /** The lowercase search query, highlighted in the name */
  query: string;
  /** The file or folder being renamed */
  renaming: FileEntry | undefined;
  actions: ExplorerActions;
}

/** The id of the tree item that holds the name field of a new file or folder; the Explorer does not remember it */
export const NEW_ENTRY_ROW_ID = 'new-entry:';

/** The key labelled "delete" on a Mac keyboard sends Backspace */
const DELETE_KEYS: ReadonlySet<string> = new Set(['Delete', 'Backspace']);

const ICON_PROPS = { className: 'cs--explorer__row-icon', 'aria-hidden': true } as const;

/** The icon of a row: an open or closed folder, the type of a file, or what a new entry will be */
const EntryIcon: FunctionComponent<{ row: ExplorerRow }> = ({ row }) => {
  if (row.kind === 'new-entry')
    return row.entryKind === 'folder' ? <Folder {...ICON_PROPS} /> : <Document {...ICON_PROPS} />;
  if (row.kind === 'folder') return row.isExpanded ? <FolderOpen {...ICON_PROPS} /> : <Folder {...ICON_PROPS} />;
  if (row.node.type === 'integration') return <DocumentConfiguration {...ICON_PROPS} />;
  if (row.node.type === 'integration-test') return <TestTool {...ICON_PROPS} />;
  return <Document {...ICON_PROPS} />;
};

/** Indents the row by its depth, see `.cs--explorer__row` */
const depthStyle = (depth: number) => ({ '--cs-explorer-row-depth': depth }) as CSSProperties;

/**
 * One row of the Explorer tree: a folder with its chevron, a file, or the name field of a new file or folder.
 *
 * A click on a file opens it, a click on a folder only focuses it, and the chevron expands or collapses the folder.
 * F2 renames the entry, Delete or Backspace deletes it; the tree handles the keys that move between rows.
 */
export const ExplorerEntry: FunctionComponent<ExplorerEntryProps> = ({
  row,
  isOpenFile,
  isTabStop,
  query,
  renaming,
  actions,
}) => {
  if (row.kind === 'new-entry') {
    return (
      <div
        role="treeitem"
        id={NEW_ENTRY_ROW_ID}
        aria-level={row.depth + 1}
        aria-posinset={row.positionInSet}
        aria-setsize={row.setSize}
        aria-selected={false}
        tabIndex={-1}
        className="cs--explorer__row cs--explorer__row--leaf"
        style={depthStyle(row.depth)}
        data-testid="explorer-new-entry"
      >
        <EntryIcon row={row} />
        <span className="cs--explorer__row-label">
          <NewEntryField
            kind={row.entryKind}
            folderPath={row.folderPath}
            onDone={(byKeyboard, created) => {
              actions.finishCreate(row.key, byKeyboard, created);
            }}
          />
        </span>
      </div>
    );
  }

  const { node } = row;
  const isFolder = row.kind === 'folder';
  const isExpanded = isFolder && row.isExpanded;

  const handleRowClick = () => {
    if (!isFolder) actions.openFile(node);
  };

  const handleToggleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    actions.toggleFolder(node.id, !isExpanded);
  };

  /** Delete or Backspace asks to delete the entry, F2 renames it */
  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (DELETE_KEYS.has(event.key)) {
      event.stopPropagation();
      actions.requestDelete(node);
    } else if (event.key === 'F2') {
      event.stopPropagation();
      event.preventDefault();
      actions.requestRename(node.id);
    }
  };

  let label: ReactNode;
  if (renaming?.key === node.id) {
    const finishRename = (byKeyboard: boolean) => {
      actions.finishRename(renaming.key, byKeyboard);
    };
    label =
      renaming.kind === 'folder' ? (
        <RenameFolderField folder={renaming} onDone={finishRename} />
      ) : (
        <RenameField file={renaming} onDone={finishRename} />
      );
  } else {
    label = (
      <EntryLabel
        node={node}
        query={query}
        requestDelete={actions.requestDelete}
        requestRename={actions.requestRename}
      />
    );
  }

  return (
    // The tree handles the keys that move between rows; the row only adds rename and delete
    <div
      role="treeitem"
      id={node.id}
      aria-level={row.depth + 1}
      aria-posinset={row.positionInSet}
      aria-setsize={row.setSize}
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isOpenFile}
      aria-keyshortcuts="F2 Delete Backspace"
      tabIndex={isTabStop ? 0 : -1}
      className={['cs--explorer__row', !isFolder && 'cs--explorer__row--leaf', isOpenFile && 'cs--explorer__row--open']
        .filter(Boolean)
        .join(' ')}
      style={depthStyle(row.depth)}
      data-testid={`explorer-${isFolder ? 'folder' : 'file'}-${node.path}`}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      {isFolder && (
        // A pointer shortcut; keyboard users expand and collapse with the arrow keys and Enter on the row
        <span
          className={['cs--explorer__toggle', isExpanded && 'cs--explorer__toggle--expanded'].filter(Boolean).join(' ')}
          aria-hidden="true"
          data-testid={`explorer-toggle-${node.path}`}
          onClick={handleToggleClick}
        >
          <CaretDown />
        </span>
      )}
      <EntryIcon row={row} />
      <span className="cs--explorer__row-label">{label}</span>
    </div>
  );
};
