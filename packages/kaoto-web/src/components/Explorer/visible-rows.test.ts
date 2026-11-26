import { buildTree } from './build-tree';
import { getVisibleRows } from './visible-rows';

const file = (path: string) => ({ key: `k:${path}`, kind: 'file' as const, path });
const folder = (path: string) => ({ key: `k:${path}`, kind: 'folder' as const, path });

const TREE = buildTree([
  folder('routes'),
  folder('routes/orders'),
  file('routes/orders/a.yaml'),
  file('routes/b.yaml'),
  folder('routes2'),
  file('routes2/c.yaml'),
  file('top.yaml'),
]);

const expanded = (...paths: string[]) => Object.fromEntries(paths.map((path) => [`k:${path}`, true]));

/** The rows as `<kind> <path or folder path> @<depth>`, for compact expectations */
const describeRows = (rows: ReturnType<typeof getVisibleRows>) =>
  rows.map((row) =>
    row.kind === 'new-entry'
      ? `new-${row.entryKind} in '${row.folderPath}' @${row.depth}`
      : `${row.kind} ${row.node.path} @${row.depth}`,
  );

describe('getVisibleRows', () => {
  it.each([
    ['nothing expanded', expanded(), ['folder routes @0', 'folder routes2 @0', 'file top.yaml @0']],
    [
      'a folder expanded',
      expanded('routes'),
      ['folder routes @0', 'folder routes/orders @1', 'file routes/b.yaml @1', 'folder routes2 @0', 'file top.yaml @0'],
    ],
    [
      'a folder and its subfolder expanded',
      expanded('routes', 'routes/orders'),
      [
        'folder routes @0',
        'folder routes/orders @1',
        'file routes/orders/a.yaml @2',
        'file routes/b.yaml @1',
        'folder routes2 @0',
        'file top.yaml @0',
      ],
    ],
    [
      'a subfolder expanded inside a collapsed folder',
      expanded('routes/orders'),
      ['folder routes @0', 'folder routes2 @0', 'file top.yaml @0'],
    ],
  ])('shows only the children of expanded folders: %s', (_, expandedFolders, expected) => {
    const rows = getVisibleRows(TREE, { expandedFolders, query: '' });

    expect(describeRows(rows)).toEqual(expected);
  });

  it('marks folders as expanded or collapsed', () => {
    const rows = getVisibleRows(TREE, { expandedFolders: expanded('routes'), query: '' });

    expect(rows.filter((row) => row.kind === 'folder').map((row) => [row.node.path, row.isExpanded])).toEqual([
      ['routes', true],
      ['routes/orders', false],
      ['routes2', false],
    ]);
  });

  it('expands every folder with matches while searching', () => {
    const rows = getVisibleRows(TREE, { expandedFolders: expanded(), query: 'a.y' });

    expect(describeRows(rows)).toEqual(['folder routes @0', 'folder routes/orders @1', 'file routes/orders/a.yaml @2']);
    expect(rows.every((row) => row.kind !== 'folder' || row.isExpanded)).toBe(true);
  });

  it('shows no rows when the search matches nothing', () => {
    expect(getVisibleRows(TREE, { expandedFolders: expanded(), query: 'zzz' })).toEqual([]);
  });

  it.each([
    [
      'a file at the root, after the folders',
      { kind: 'file' as const, folderPath: '' },
      expanded(),
      ['folder routes @0', 'folder routes2 @0', "new-file in '' @0", 'file top.yaml @0'],
    ],
    [
      'a folder at the root, first',
      { kind: 'folder' as const, folderPath: '' },
      expanded(),
      ["new-folder in '' @0", 'folder routes @0', 'folder routes2 @0', 'file top.yaml @0'],
    ],
    [
      'a file in a folder, before its first file',
      { kind: 'file' as const, folderPath: 'routes' },
      expanded('routes'),
      [
        'folder routes @0',
        'folder routes/orders @1',
        "new-file in 'routes' @1",
        'file routes/b.yaml @1',
        'folder routes2 @0',
        'file top.yaml @0',
      ],
    ],
    [
      'a folder in a folder, first',
      { kind: 'folder' as const, folderPath: 'routes' },
      expanded('routes'),
      [
        'folder routes @0',
        "new-folder in 'routes' @1",
        'folder routes/orders @1',
        'file routes/b.yaml @1',
        'folder routes2 @0',
        'file top.yaml @0',
      ],
    ],
    [
      'a file in a nested folder',
      { kind: 'file' as const, folderPath: 'routes/orders' },
      expanded('routes', 'routes/orders'),
      [
        'folder routes @0',
        'folder routes/orders @1',
        "new-file in 'routes/orders' @2",
        'file routes/orders/a.yaml @2',
        'file routes/b.yaml @1',
        'folder routes2 @0',
        'file top.yaml @0',
      ],
    ],
    [
      'a file in a folder of only folders, last',
      { kind: 'file' as const, folderPath: 'deep' },
      expanded('deep'),
      ['folder deep @0', 'folder deep/inner @1', "new-file in 'deep' @1"],
    ],
    [
      'a file in a folder whose path is the start of another folder, only there',
      { kind: 'file' as const, folderPath: 'routes' },
      expanded('routes', 'routes2'),
      [
        'folder routes @0',
        'folder routes/orders @1',
        "new-file in 'routes' @1",
        'file routes/b.yaml @1',
        'folder routes2 @0',
        'file routes2/c.yaml @1',
        'file top.yaml @0',
      ],
    ],
  ])('puts the row of a new entry in its place: %s', (name, placement, expandedFolders, expected) => {
    const tree = name.includes('only folders') ? buildTree([folder('deep'), folder('deep/inner')]) : TREE;

    const rows = getVisibleRows(tree, { expandedFolders, query: '', newEntry: { ...placement, key: 1 } });

    expect(describeRows(rows)).toEqual(expected);
  });

  it('numbers each row among its siblings, the name field of a new entry included', () => {
    const rows = getVisibleRows(TREE, {
      expandedFolders: expanded('routes'),
      query: '',
      newEntry: { kind: 'file', folderPath: 'routes', key: 1 },
    });

    expect(rows.map((row, index) => `${describeRows(rows)[index]} ${row.positionInSet}/${row.setSize}`)).toEqual([
      'folder routes @0 1/3',
      'folder routes/orders @1 1/3',
      "new-file in 'routes' @1 2/3",
      'file routes/b.yaml @1 3/3',
      'folder routes2 @0 2/3',
      'file top.yaml @0 3/3',
    ]);
  });

  it('numbers the rows among the siblings that match the search', () => {
    const rows = getVisibleRows(TREE, { expandedFolders: expanded(), query: 'c.yaml' });

    expect(rows.map((row) => `${row.positionInSet}/${row.setSize}`)).toEqual(['1/1', '1/1']);
  });

  it('gives the row of a new entry its key', () => {
    const rows = getVisibleRows(TREE, {
      expandedFolders: expanded(),
      query: '',
      newEntry: { kind: 'file', folderPath: '', key: 7 },
    });

    expect(rows.find((row) => row.kind === 'new-entry')).toMatchObject({ key: 7 });
  });

  it('keeps the folders on the way to a new entry expanded, so that its field stays while the entry is stored', () => {
    const rows = getVisibleRows(TREE, {
      expandedFolders: expanded(),
      query: '',
      newEntry: { kind: 'file', folderPath: 'routes/orders', key: 1 },
    });

    expect(describeRows(rows)).toEqual([
      'folder routes @0',
      'folder routes/orders @1',
      "new-file in 'routes/orders' @2",
      'file routes/orders/a.yaml @2',
      'file routes/b.yaml @1',
      'folder routes2 @0',
      'file top.yaml @0',
    ]);
    expect(
      rows
        .filter((row) => row.kind === 'folder' && row.isExpanded)
        .map((row) => row.kind === 'folder' && row.node.path),
    ).toEqual(['routes', 'routes/orders']);
  });

  it('keeps the folders on the way to an entry being renamed expanded, so that its field stays while the name is stored', () => {
    const rows = getVisibleRows(TREE, {
      expandedFolders: expanded(),
      query: '',
      renamingPath: 'routes/orders/a.yaml',
    });

    expect(describeRows(rows)).toContain('file routes/orders/a.yaml @2');
  });

  it('does not expand a folder being renamed itself', () => {
    const rows = getVisibleRows(TREE, { expandedFolders: expanded(), query: '', renamingPath: 'routes/orders' });

    expect(rows.find((row) => row.kind === 'folder' && row.node.path === 'routes/orders')).toMatchObject({
      isExpanded: false,
    });
  });

  it('keeps indenting below ten levels', () => {
    const paths = Array.from({ length: 11 }, (_, index) =>
      Array.from({ length: index + 1 }, (__, level) => `f${level}`).join('/'),
    );
    const deepTree = buildTree(paths.map(folder));

    const rows = getVisibleRows(deepTree, { expandedFolders: expanded(...paths), query: '' });

    expect(rows.at(-1)).toMatchObject({ kind: 'folder', depth: 10 });
  });
});
