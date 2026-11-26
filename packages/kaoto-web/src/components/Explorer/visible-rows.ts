import { parentFolderOf } from '../../services/files/file-path';
import { ExplorerFile } from './explorer-file';
import { filterFiles } from './filterFiles';
import { NewEntryKind } from './NewEntryField';

/** Where a row sits in the tree: its depth, and its place among its siblings, both shown to assistive technology */
interface RowPlace {
  depth: number;
  /** The place among the siblings, counted from 1 */
  positionInSet: number;
  /** How many siblings there are, the row itself included */
  setSize: number;
}

/** A row of the Explorer tree as it is shown: a folder, a file, or the name field of a new file or folder */
export type ExplorerRow =
  | ({ kind: 'folder'; node: ExplorerFile; isExpanded: boolean } & RowPlace)
  | ({ kind: 'file'; node: ExplorerFile } & RowPlace)
  | ({ kind: 'new-entry'; entryKind: NewEntryKind; folderPath: string; key: number } & RowPlace);

/** Where the name field of a new file or folder goes */
export interface NewEntryPlacement {
  kind: NewEntryKind;
  /** The folder the entry is created in, empty for the root */
  folderPath: string;
  /** Changes with every start, so that a new start mounts a new field */
  key: number;
}

interface VisibleRowsOptions {
  /** The folders the user expanded, by node id */
  expandedFolders: Record<string, boolean>;
  /** The lowercase search query; while there is one, every folder with matches is expanded */
  query: string;
  newEntry?: NewEntryPlacement;
  /** The path of the file or folder being renamed */
  renamingPath?: string;
}

/** The folder and every folder above it, `''` for the root giving none */
const folderAndParentPaths = (folderPath: string): string[] =>
  folderPath ? folderPath.split('/').map((_, index, segments) => segments.slice(0, index + 1).join('/')) : [];

/** The index among the siblings where a new entry goes: a folder first, a file before the first file */
const newEntryIndex = (siblings: ExplorerFile[], kind: NewEntryKind): number => {
  if (kind === 'folder') return 0;
  const firstFile = siblings.findIndex((sibling) => !sibling.children);
  return firstFile === -1 ? siblings.length : firstFile;
};

/**
 * The rows of the Explorer tree that are shown, top to bottom, each with its depth and its place among its siblings:
 * the entries that match the search, the children of expanded folders only, and the name field of a new entry in its
 * folder, which counts as one of the siblings there.
 *
 * The folders on the way to a new entry or to the entry being renamed stay expanded while its field is open: the field
 * stores the name when it loses the focus, also to a click that collapses one of these folders, and it has to stay
 * mounted until the name is stored. A folder the user collapses meanwhile collapses once the field is done.
 */
export function getVisibleRows(
  tree: ExplorerFile[],
  { expandedFolders, query, newEntry, renamingPath }: VisibleRowsOptions,
): ExplorerRow[] {
  const rows: ExplorerRow[] = [];
  const foldersKeptExpanded = new Set([
    ...(newEntry ? folderAndParentPaths(newEntry.folderPath) : []),
    ...(renamingPath ? folderAndParentPaths(parentFolderOf(renamingPath)) : []),
  ]);

  const addRows = (nodes: ExplorerFile[], folderPath: string, depth: number) => {
    const newEntryAt = newEntry?.folderPath === folderPath ? newEntryIndex(nodes, newEntry.kind) : -1;
    const setSize = nodes.length + (newEntryAt === -1 ? 0 : 1);
    /** The place of the next row among its siblings */
    let positionInSet = 1;
    const placeOfNextRow = (): RowPlace => ({ depth, positionInSet: positionInSet++, setSize });

    nodes.forEach((node, index) => {
      if (index === newEntryAt) addNewEntryRow(placeOfNextRow());
      if (!node.children) {
        rows.push({ kind: 'file', node, ...placeOfNextRow() });
        return;
      }
      const isExpanded = query !== '' || !!expandedFolders[node.id] || foldersKeptExpanded.has(node.path);
      rows.push({ kind: 'folder', node, isExpanded, ...placeOfNextRow() });
      if (isExpanded) addRows(node.children, node.path, depth + 1);
    });
    if (newEntryAt === nodes.length) addNewEntryRow(placeOfNextRow());
  };

  const addNewEntryRow = (place: RowPlace) => {
    if (!newEntry) return;
    rows.push({
      kind: 'new-entry',
      entryKind: newEntry.kind,
      folderPath: newEntry.folderPath,
      key: newEntry.key,
      ...place,
    });
  };

  addRows(filterFiles(tree, query), '', 0);
  return rows;
}
