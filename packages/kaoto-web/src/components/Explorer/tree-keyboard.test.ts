import { ExplorerFile } from './explorer-file';
import { getKeyboardMove, keepsBrowserDefault } from './tree-keyboard';
import { ExplorerRow } from './visible-rows';

const node = (id: string, children?: ExplorerFile[]): ExplorerFile => ({
  id,
  path: id,
  name: id,
  type: children ? 'folder' : 'integration',
  ...(children ? { children } : {}),
});

const A1 = node('a1');
const A = node('A', [A1]);
const B = node('B', [node('b1')]);
const C = node('C', []);
const TOP = node('top');

/** Folder A expanded with its file a1, folder B collapsed, folder C expanded but empty, file top */
const ROWS: ExplorerRow[] = [
  { kind: 'folder', node: A, depth: 0, positionInSet: 1, setSize: 1, isExpanded: true },
  { kind: 'file', node: A1, depth: 1, positionInSet: 1, setSize: 1 },
  { kind: 'folder', node: B, depth: 0, positionInSet: 1, setSize: 1, isExpanded: false },
  { kind: 'folder', node: C, depth: 0, positionInSet: 1, setSize: 1, isExpanded: true },
  { kind: 'file', node: TOP, depth: 0, positionInSet: 1, setSize: 1 },
];
const [ROW_A, ROW_A1, ROW_B, ROW_C, ROW_TOP] = [0, 1, 2, 3, 4];

describe('getKeyboardMove', () => {
  it.each([
    ['ArrowDown moves to the next row', ROW_A, 'ArrowDown', { kind: 'focus', index: ROW_A1 }],
    ['ArrowDown on the last row stays', ROW_TOP, 'ArrowDown', { kind: 'none' }],
    ['ArrowUp moves to the previous row', ROW_B, 'ArrowUp', { kind: 'focus', index: ROW_A1 }],
    ['ArrowUp on the first row stays', ROW_A, 'ArrowUp', { kind: 'none' }],
    ['Home moves to the first row', ROW_C, 'Home', { kind: 'focus', index: ROW_A }],
    ['End moves to the last row', ROW_A1, 'End', { kind: 'focus', index: ROW_TOP }],
    ['ArrowRight expands a collapsed folder', ROW_B, 'ArrowRight', { kind: 'toggle', folderId: 'B', isExpanded: true }],
    [
      'ArrowRight on an expanded folder moves to its first child',
      ROW_A,
      'ArrowRight',
      { kind: 'focus', index: ROW_A1 },
    ],
    ['ArrowRight on an expanded empty folder stays', ROW_C, 'ArrowRight', { kind: 'none' }],
    ['ArrowRight on a file stays', ROW_TOP, 'ArrowRight', { kind: 'none' }],
    [
      'ArrowLeft collapses an expanded folder',
      ROW_A,
      'ArrowLeft',
      { kind: 'toggle', folderId: 'A', isExpanded: false },
    ],
    ['ArrowLeft on a file moves to its folder', ROW_A1, 'ArrowLeft', { kind: 'focus', index: ROW_A }],
    ['ArrowLeft on a collapsed folder at the root stays', ROW_B, 'ArrowLeft', { kind: 'none' }],
    ['ArrowLeft on a file at the root stays', ROW_TOP, 'ArrowLeft', { kind: 'none' }],
    ['Enter expands a collapsed folder', ROW_B, 'Enter', { kind: 'toggle', folderId: 'B', isExpanded: true }],
    ['Enter collapses an expanded folder', ROW_A, 'Enter', { kind: 'toggle', folderId: 'A', isExpanded: false }],
    ['Enter opens a file', ROW_A1, 'Enter', { kind: 'open', node: A1 }],
    ['Space opens a file', ROW_TOP, ' ', { kind: 'open', node: TOP }],
    ['Space on a folder does nothing', ROW_B, ' ', { kind: 'none' }],
  ])('%s', (_, index, key, move) => {
    expect(getKeyboardMove(ROWS, index, key)).toEqual(move);
  });

  it('leaves keys alone that the tree does not use', () => {
    expect(getKeyboardMove(ROWS, ROW_A, 'x')).toBeUndefined();
  });

  it('leaves every key alone without rows', () => {
    expect(getKeyboardMove([], 0, 'ArrowDown')).toBeUndefined();
  });

  it.each(['Enter', ' ', 'ArrowRight'])('leaves %j alone without a row, rather than acting on the last one', (key) => {
    expect(getKeyboardMove(ROWS, -1, key)).toBeUndefined();
  });

  describe('on the row of a new entry, e.g. reached while its field stays open after a failed store', () => {
    /** The name field of a new file between a1 and B */
    const ROWS_WITH_NEW_ENTRY: ExplorerRow[] = [
      ...ROWS.slice(0, 2),
      { kind: 'new-entry', entryKind: 'file', folderPath: 'A', depth: 1, positionInSet: 1, setSize: 1, key: 1 },
      ...ROWS.slice(2),
    ];
    const NEW_ENTRY = 2;

    it.each([
      ['ArrowDown', NEW_ENTRY + 1],
      ['ArrowUp', NEW_ENTRY - 1],
      ['Home', 0],
      ['End', ROWS_WITH_NEW_ENTRY.length - 1],
    ])('moves on with %s, so that the arrows do not get stuck on the row of the field', (key, index) => {
      expect(getKeyboardMove(ROWS_WITH_NEW_ENTRY, NEW_ENTRY, key)).toEqual({ kind: 'focus', index });
    });

    it.each(['Enter', ' ', 'ArrowRight', 'ArrowLeft'])('leaves %j to the name field', (key) => {
      expect(getKeyboardMove(ROWS_WITH_NEW_ENTRY, NEW_ENTRY, key)).toBeUndefined();
    });
  });
});

describe('keepsBrowserDefault', () => {
  it.each([
    ['ArrowLeft', true],
    ['ArrowRight', true],
    ['ArrowUp', false],
    ['ArrowDown', false],
    ['Home', false],
    ['End', false],
    ['Enter', false],
    [' ', false],
  ])('tells whether %j keeps what the browser does with it, e.g. Alt+arrow to go back and forward', (key, kept) => {
    expect(keepsBrowserDefault(key)).toBe(kept);
  });
});
