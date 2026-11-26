import { ExplorerFile } from './explorer-file';
import { ExplorerRow } from './visible-rows';

/** What a key on a row of the Explorer tree does */
export type KeyboardMove =
  | { kind: 'focus'; index: number }
  | { kind: 'toggle'; folderId: string; isExpanded: boolean }
  | { kind: 'open'; node: ExplorerFile }
  /** The key belongs to the tree, but changes nothing here, e.g. ArrowDown on the last row */
  | { kind: 'none' };

const NO_MOVE: KeyboardMove = { kind: 'none' };

const getFocusMove = (index: number, rows: ExplorerRow[]): KeyboardMove =>
  index >= 0 && index < rows.length ? { kind: 'focus', index } : NO_MOVE;

/** The nearest row above that is less deep: the folder the row is in */
const getParentRowIndex = (rows: ExplorerRow[], index: number): number => {
  for (let candidate = index - 1; candidate >= 0; candidate--) {
    if (rows[candidate].depth < rows[index].depth) return candidate;
  }
  return -1;
};

type EntryRow = Exclude<ExplorerRow, { kind: 'new-entry' }>;

/** ArrowRight: expands a collapsed folder, moves into an expanded one, does nothing on a file or an empty folder */
const getExpandMove = (rows: ExplorerRow[], index: number, row: EntryRow): KeyboardMove => {
  if (row.kind !== 'folder') return NO_MOVE;
  if (!row.isExpanded) return { kind: 'toggle', folderId: row.node.id, isExpanded: true };
  const firstChild = rows.at(index + 1);
  return firstChild && firstChild.depth > row.depth ? { kind: 'focus', index: index + 1 } : NO_MOVE;
};

/** ArrowLeft: collapses an expanded folder, else moves to the folder the row is in */
const getCollapseMove = (rows: ExplorerRow[], index: number, row: EntryRow): KeyboardMove =>
  row.kind === 'folder' && row.isExpanded
    ? { kind: 'toggle', folderId: row.node.id, isExpanded: false }
    : getFocusMove(getParentRowIndex(rows, index), rows);

/** Enter, Space and the arrows that expand and collapse: what they do on a folder or a file */
const getEntryMove = (rows: ExplorerRow[], index: number, row: EntryRow, key: string): KeyboardMove | undefined => {
  const isFolder = row.kind === 'folder';
  switch (key) {
    case 'ArrowRight':
      return getExpandMove(rows, index, row);
    case 'ArrowLeft':
      return getCollapseMove(rows, index, row);
    case 'Enter':
      return isFolder
        ? { kind: 'toggle', folderId: row.node.id, isExpanded: !row.isExpanded }
        : { kind: 'open', node: row.node };
    case ' ':
      return isFolder ? NO_MOVE : { kind: 'open', node: row.node };
    default:
      return undefined;
  }
};

/**
 * Whether the tree leaves the key's default to the browser after using it: ArrowLeft and ArrowRight, so that Alt+arrow
 * still goes back and forward. Every other key the tree uses has its default prevented, e.g. scrolling the page.
 */
export const keepsBrowserDefault = (key: string): boolean => key === 'ArrowLeft' || key === 'ArrowRight';

/**
 * What a key pressed on a row of the Explorer tree does, following the WAI-ARIA tree view pattern: the arrow keys,
 * Home and End move between the visible rows, ArrowRight and ArrowLeft expand and collapse folders or move into and out
 * of them, Enter toggles a folder and opens a file, Space opens a file.
 *
 * On the row of a new entry only ArrowUp, ArrowDown, Home and End move on; its name field handles every other key.
 *
 * @returns nothing for a key the tree does not use on the row
 */
export function getKeyboardMove(rows: ExplorerRow[], index: number, key: string): KeyboardMove | undefined {
  // `at` would count a negative index from the end
  const row = index >= 0 ? rows.at(index) : undefined;
  if (!row) return undefined;

  switch (key) {
    case 'ArrowDown':
      return getFocusMove(index + 1, rows);
    case 'ArrowUp':
      return getFocusMove(index - 1, rows);
    case 'Home':
      return getFocusMove(0, rows);
    case 'End':
      return getFocusMove(rows.length - 1, rows);
    default:
      return row.kind === 'new-entry' ? undefined : getEntryMove(rows, index, row, key);
  }
}
