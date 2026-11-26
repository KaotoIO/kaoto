import { FocusEvent, FunctionComponent, KeyboardEvent as ReactKeyboardEvent, useRef } from 'react';

import { FileEntry } from '../../store/files/files-ui-state';
import { ExplorerActions, ExplorerEntry, NEW_ENTRY_ROW_ID } from './ExplorerEntry';
import { getKeyboardMove, keepsBrowserDefault } from './tree-keyboard';
import { ExplorerRow } from './visible-rows';

interface ExplorerTreeProps {
  /** The rows to show, see `getVisibleRows` */
  rows: ExplorerRow[];
  /** The key of the file open in the editor */
  openFileKey: string | undefined;
  /** The id of the row focused last, kept by the Explorer; the first choice for the tab stop */
  focusedRowId: string | undefined;
  /** Reports a row that got the focus, the name field of a new entry left out */
  onRowFocus: (rowId: string) => void;
  /** The lowercase search query, highlighted in the names */
  query: string;
  /** The file or folder being renamed */
  renaming: FileEntry | undefined;
  actions: ExplorerActions;
}

/** The id of the tree item that shows the row */
const rowId = (row: ExplorerRow): string => (row.kind === 'new-entry' ? NEW_ENTRY_ROW_ID : row.node.id);

/**
 * The file tree of the Explorer: the visible rows, top to bottom, and the keys that move between them.
 *
 * One row is the tab stop: the row focused last while it is shown, else the open file while it is shown, else the
 * first row.
 */
export const ExplorerTree: FunctionComponent<ExplorerTreeProps> = ({
  rows,
  openFileKey,
  focusedRowId,
  onRowFocus,
  query,
  renaming,
  actions,
}) => {
  const treeRef = useRef<HTMLDivElement>(null);

  const shownIds = new Set(rows.map(rowId));
  const firstEntryRow = rows.find((row) => row.kind !== 'new-entry');
  const tabStopId = [focusedRowId, openFileKey, firstEntryRow && rowId(firstEntryRow)].find(
    (id) => id !== undefined && id !== NEW_ENTRY_ROW_ID && shownIds.has(id),
  );

  const reportFocusedRow = (event: FocusEvent<HTMLDivElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (row?.id && row.id !== NEW_ENTRY_ROW_ID) onRowFocus(row.id);
  };

  const focusRow = (index: number) => {
    document.getElementById(rowId(rows[index]))?.focus();
  };

  /**
   * Moves between the rows, expands and collapses folders and opens files. No key pressed in the tree reaches the page,
   * so that the page's own shortcuts do not act on it; see keepsBrowserDefault for the keys whose default stays.
   */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // A safety net: the name fields stop their keys themselves, see NameField
    if (target.tagName === 'INPUT') return;
    event.stopPropagation();
    const row = target.closest<HTMLElement>('[role="treeitem"]');
    const index = rows.findIndex((candidate) => rowId(candidate) === row?.id);
    // A key on the tree itself, e.g. after a click beside the rows, belongs to no row
    if (index === -1) return;
    const move = getKeyboardMove(rows, index, event.key);
    if (!move) return;

    if (!keepsBrowserDefault(event.key)) event.preventDefault();
    if (move.kind === 'focus') focusRow(move.index);
    else if (move.kind === 'toggle') actions.toggleFolder(move.folderId, move.isExpanded);
    else if (move.kind === 'open') actions.openFile(move.node);
  };

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label="Project files"
      tabIndex={-1}
      className="cs--explorer__tree-rows"
      onKeyDown={handleKeyDown}
      onFocus={reportFocusedRow}
    >
      {rows.map((row) => (
        <ExplorerEntry
          key={row.kind === 'new-entry' ? `${NEW_ENTRY_ROW_ID}${row.key}` : row.node.id}
          row={row}
          isOpenFile={row.kind !== 'new-entry' && row.node.id === openFileKey}
          isTabStop={rowId(row) === tabStopId}
          query={query}
          renaming={renaming}
          actions={actions}
        />
      ))}
    </div>
  );
};
