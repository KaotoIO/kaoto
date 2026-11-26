import {
  FocusEvent,
  FunctionComponent,
  KeyboardEvent as ReactKeyboardEvent,
  Ref,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Components, ListRange, ScrollerProps, Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { FileEntry } from '../../store/files/files-ui-state';
import { ExplorerActions, ExplorerEntry, NEW_ENTRY_ROW_ID } from './ExplorerEntry';
import { getKeyboardMove, keepsBrowserDefault } from './tree-keyboard';
import { ExplorerRow } from './visible-rows';

/** How the Explorer reaches rows that may not be rendered */
export interface ExplorerTreeHandle {
  /** Scrolls the row into view and focuses it; false when no row has that id */
  focusRow: (rowId: string) => boolean;
  /** Scrolls the first file or folder into view and focuses it; false when there is none */
  focusFirstRow: () => boolean;
  /** Scrolls the row into view without focusing it, e.g. a name field that focuses itself once it mounts */
  scrollToRow: (rowId: string) => void;
}

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
  ref?: Ref<ExplorerTreeHandle>;
}

/** Rows rendered above and below the ones in view, in pixels, so that a short scroll shows no gap */
const OVERSCAN_PX = 320;

/** No row rendered yet */
const NO_RANGE: ListRange = { startIndex: 0, endIndex: -1 };

/** How many frames a focus request waits for its row to be rendered at its place, about half a second */
const FOCUS_WAIT_FRAMES = 30;

/**
 * Virtuoso's scroller, without its own tab stop: Tab reaches the tree through its tab stop row, and the arrow keys move
 * between the rows rather than scrolling the list
 */
const ScrollerWithoutTabStop: FunctionComponent<ScrollerProps> = ({ children, ...props }) => (
  <div {...props} tabIndex={-1}>
    {children}
  </div>
);

/** The space above the first row and below the last one; it scrolls with the rows */
const TreeEdgeSpace: FunctionComponent = () => <div className="cs--explorer__tree-edge" />;

const LIST_COMPONENTS: Components = {
  Scroller: ScrollerWithoutTabStop,
  Header: TreeEdgeSpace,
  Footer: TreeEdgeSpace,
};

/** The id of the tree item that shows the row */
const rowId = (row: ExplorerRow): string => (row.kind === 'new-entry' ? NEW_ENTRY_ROW_ID : row.node.id);

/** The React key of the row; a new start of a new entry mounts a new field */
const rowKey = (row: ExplorerRow): string => (row.kind === 'new-entry' ? `${NEW_ENTRY_ROW_ID}${row.key}` : row.node.id);

/**
 * The index of the row Tab stops at, or -1 without rows: the focused row, else the open file, else the first entry,
 * whichever of them is shown. The name field of a new entry is never the tab stop.
 */
const tabStopIndexOf = (rows: ExplorerRow[], focusedRowId?: string, openFileKey?: string): number => {
  const shownIds = new Set(rows.map(rowId));
  const firstEntryRow = rows.find((row) => row.kind !== 'new-entry');
  const tabStopId = [focusedRowId, openFileKey, firstEntryRow && rowId(firstEntryRow)].find(
    (id) => id !== undefined && id !== NEW_ENTRY_ROW_ID && shownIds.has(id),
  );
  return rows.findIndex((row) => rowId(row) === tabStopId);
};

/**
 * The file tree of the Explorer: the visible rows, top to bottom, and the keys that move between them. Only the rows
 * in view are rendered; a row out of view is scrolled into view before it gets the focus.
 *
 * One row is the tab stop: the row focused last while it is shown, else the open file while it is shown, else the
 * first row. While that row is not rendered, the tree itself takes the tab stop and hands the focus on to the row.
 */
export const ExplorerTree: FunctionComponent<ExplorerTreeProps> = ({
  rows,
  openFileKey,
  focusedRowId,
  onRowFocus,
  query,
  renaming,
  actions,
  ref,
}) => {
  const treeRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [renderedRange, setRenderedRange] = useState<ListRange>(NO_RANGE);
  /** Counts the focus requests, so that only the latest one focuses its row */
  const latestFocusRequestRef = useRef(0);

  // Goes over all rows, so only when they or the candidates change, not on every scroll step
  const tabStopIndex = useMemo(
    () => tabStopIndexOf(rows, focusedRowId, openFileKey),
    [rows, focusedRowId, openFileKey],
  );
  const tabStopId = tabStopIndex === -1 ? undefined : rowId(rows[tabStopIndex]);
  const isTabStopRendered = tabStopIndex >= renderedRange.startIndex && tabStopIndex <= renderedRange.endIndex;

  /**
   * Focuses the row element if it is rendered at its place. Right after the rows change, Virtuoso may still show a row
   * at its old place, e.g. a renamed entry that sorts elsewhere; focusing it there would lose the focus a render later.
   */
  const focusRowRenderedAt = (id: string, index: number): boolean => {
    const element = document.getElementById(id);
    if (element?.closest<HTMLElement>('[data-index]')?.dataset.index !== String(index)) return false;
    element.focus();
    return true;
  };

  /**
   * Focuses the row, scrolling it into view first when it is not rendered at its place, and waiting for it frame by
   * frame. A later request takes over from an earlier one that is still waiting.
   */
  const focusRowAt = (index: number) => {
    const id = rowId(rows[index]);
    const request = ++latestFocusRequestRef.current;
    if (focusRowRenderedAt(id, index)) return;
    const focusOnceRendered = (framesLeft: number) => {
      if (request !== latestFocusRequestRef.current || focusRowRenderedAt(id, index) || framesLeft === 0) return;
      requestAnimationFrame(() => {
        focusOnceRendered(framesLeft - 1);
      });
    };
    virtuosoRef.current?.scrollIntoView({
      index,
      done: () => {
        focusOnceRendered(FOCUS_WAIT_FRAMES);
      },
    });
  };

  useImperativeHandle(ref, () => ({
    focusRow: (id) => {
      const index = rows.findIndex((row) => rowId(row) === id);
      if (index === -1) return false;
      focusRowAt(index);
      return true;
    },
    focusFirstRow: () => {
      const index = rows.findIndex((row) => row.kind !== 'new-entry');
      if (index === -1) return false;
      focusRowAt(index);
      return true;
    },
    scrollToRow: (id) => {
      const index = rows.findIndex((row) => rowId(row) === id);
      if (index !== -1) virtuosoRef.current?.scrollIntoView({ index });
    },
  }));

  /** The tree gets the focus only as the tab stop of a row that is not rendered, and hands it on to that row */
  const handOnFocusToTabStopRow = () => {
    if (tabStopIndex !== -1) focusRowAt(tabStopIndex);
  };

  const reportFocusedRow = (target: HTMLElement) => {
    const row = target.closest<HTMLElement>('[role="treeitem"]');
    if (row?.id && row.id !== NEW_ENTRY_ROW_ID) onRowFocus(row.id);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target === treeRef.current) handOnFocusToTabStopRow();
    else reportFocusedRow(event.target as HTMLElement);
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
    if (move.kind === 'focus') focusRowAt(move.index);
    else if (move.kind === 'toggle') actions.toggleFolder(move.folderId, move.isExpanded);
    else if (move.kind === 'open') actions.openFile(move.node);
  };

  const renderRow = (index: number) => {
    const row = rows[index];
    return (
      <ExplorerEntry
        row={row}
        isOpenFile={row.kind !== 'new-entry' && row.node.id === openFileKey}
        isTabStop={rowId(row) === tabStopId}
        query={query}
        renaming={renaming}
        actions={actions}
      />
    );
  };

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label="Project files"
      tabIndex={tabStopIndex !== -1 && !isTabStopRendered ? 0 : -1}
      className="cs--explorer__tree-rows"
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      <Virtuoso
        ref={virtuosoRef}
        components={LIST_COMPONENTS}
        totalCount={rows.length}
        computeItemKey={(index) => rowKey(rows[index])}
        increaseViewportBy={OVERSCAN_PX}
        rangeChanged={setRenderedRange}
        itemContent={renderRow}
      />
    </div>
  );
};
