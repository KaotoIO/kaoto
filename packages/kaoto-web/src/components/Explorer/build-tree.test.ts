import { buildTree, toFolderId } from './build-tree';
import { findPath } from './filterFiles';

describe('buildTree', () => {
  it('nests files into folders derived from their paths', () => {
    const tree = buildTree([{ id: 'k', path: 'integrations/routes/async/k.camel.yaml' }]);

    expect(tree).toEqual([
      {
        id: toFolderId('integrations'),
        name: 'integrations',
        type: 'folder',
        children: [
          {
            id: toFolderId('integrations/routes'),
            name: 'routes',
            type: 'folder',
            children: [
              {
                id: toFolderId('integrations/routes/async'),
                name: 'async',
                type: 'folder',
                children: [{ id: 'k', name: 'k.camel.yaml', type: 'integration' }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps files at the root', () => {
    expect(buildTree([{ id: 'a', path: 'a.xsd' }])).toEqual([{ id: 'a', name: 'a.xsd', type: 'document' }]);
  });

  it('derives the type of a file from its path', () => {
    expect(
      buildTree([
        { id: 'r', path: 'r.camel.yaml' },
        { id: 't', path: 't.citrus.yaml' },
      ]).map((node) => node.type),
    ).toEqual(['integration', 'integration-test']);
  });

  it('lists folders before files, each sorted by name', () => {
    const tree = buildTree([
      { id: 'z', path: 'z.yaml' },
      { id: 'b', path: 'b/x.yaml' },
      { id: 'a', path: 'a.yaml' },
      { id: 'c', path: 'a/y.yaml' },
    ]);

    expect(tree.map((node) => [node.type, node.name])).toEqual([
      ['folder', 'a'],
      ['folder', 'b'],
      ['integration', 'a.yaml'],
      ['integration', 'z.yaml'],
    ]);
  });

  it('puts the files of one folder under a single folder node', () => {
    const tree = buildTree([
      { id: 'x', path: 'routes/x.yaml' },
      { id: 'y', path: 'routes/y.yaml' },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children?.map((node) => node.id)).toEqual(['x', 'y']);
  });

  it('sorts names naturally, ignoring case and comparing numbers by value', () => {
    const tree = buildTree([
      { id: 'zeta', path: 'Zeta.yaml' },
      { id: 'file10', path: 'file10.yaml' },
      { id: 'alpha', path: 'alpha.yaml' },
      { id: 'file2', path: 'file2.yaml' },
    ]);

    expect(tree.map((node) => node.name)).toEqual(['alpha.yaml', 'file2.yaml', 'file10.yaml', 'Zeta.yaml']);
  });

  it('never gives a folder the id of a file', () => {
    // `integrations` is a valid file id, and the file lives in a folder of the same name
    const tree = buildTree([{ id: 'integrations', path: 'integrations/a.camel.yaml' }]);

    expect(tree[0].id).not.toBe('integrations');
    expect(findPath(tree, 'integrations')?.map((node) => node.name)).toEqual(['integrations', 'a.camel.yaml']);
  });

  it('returns an empty tree for no files', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('shows created folders without files, with their parents', () => {
    expect(buildTree([], ['a/b', 'c'])).toEqual([
      {
        id: toFolderId('a'),
        name: 'a',
        type: 'folder',
        children: [{ id: toFolderId('a/b'), name: 'b', type: 'folder', children: [] }],
      },
      { id: toFolderId('c'), name: 'c', type: 'folder', children: [] },
    ]);
  });

  it('merges a created folder with the folder of its files', () => {
    expect(buildTree([{ id: 'f', path: 'a/f.camel.yaml' }], ['a', 'a/empty'])).toEqual([
      {
        id: toFolderId('a'),
        name: 'a',
        type: 'folder',
        children: [
          { id: toFolderId('a/empty'), name: 'empty', type: 'folder', children: [] },
          { id: 'f', name: 'f.camel.yaml', type: 'integration' },
        ],
      },
    ]);
  });
});
