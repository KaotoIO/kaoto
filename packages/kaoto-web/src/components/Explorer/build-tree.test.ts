import { buildTree } from './build-tree';

const file = (key: string, path: string) => ({ key, kind: 'file' as const, path });
const folder = (key: string, path: string) => ({ key, kind: 'folder' as const, path });

describe('buildTree', () => {
  it('nests files into their folders, with the keys of the entries as ids', () => {
    const tree = buildTree([
      folder('f1', 'integrations'),
      folder('f2', 'integrations/routes'),
      file('k', 'integrations/routes/k.camel.yaml'),
    ]);

    expect(tree).toEqual([
      {
        id: 'f1',
        path: 'integrations',
        name: 'integrations',
        type: 'folder',
        children: [
          {
            id: 'f2',
            path: 'integrations/routes',
            name: 'routes',
            type: 'folder',
            children: [
              { id: 'k', path: 'integrations/routes/k.camel.yaml', name: 'k.camel.yaml', type: 'integration' },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps files at the root', () => {
    expect(buildTree([file('a', 'a.xsd')])).toEqual([{ id: 'a', path: 'a.xsd', name: 'a.xsd', type: 'document' }]);
  });

  it('derives the type of a file from its path', () => {
    expect(buildTree([file('r', 'r.camel.yaml'), file('t', 't.citrus.yaml')]).map((node) => node.type)).toEqual([
      'integration',
      'integration-test',
    ]);
  });

  it('lists folders before files, each sorted by name', () => {
    const tree = buildTree([
      file('z', 'z.camel.yaml'),
      folder('fb', 'b'),
      file('b', 'b/x.camel.yaml'),
      file('a', 'a.camel.yaml'),
      folder('fa', 'a'),
      file('c', 'a/y.camel.yaml'),
    ]);

    expect(tree.map((node) => [node.type, node.name])).toEqual([
      ['folder', 'a'],
      ['folder', 'b'],
      ['integration', 'a.camel.yaml'],
      ['integration', 'z.camel.yaml'],
    ]);
  });

  it('sorts names naturally, ignoring case and comparing numbers by value', () => {
    const tree = buildTree([
      file('zeta', 'Zeta.yaml'),
      file('file10', 'file10.yaml'),
      file('alpha', 'alpha.yaml'),
      file('file2', 'file2.yaml'),
    ]);

    expect(tree.map((node) => node.name)).toEqual(['alpha.yaml', 'file2.yaml', 'file10.yaml', 'Zeta.yaml']);
  });

  it('shows empty folders', () => {
    expect(buildTree([folder('a', 'a'), folder('b', 'a/b')])).toEqual([
      {
        id: 'a',
        path: 'a',
        name: 'a',
        type: 'folder',
        children: [{ id: 'b', path: 'a/b', name: 'b', type: 'folder', children: [] }],
      },
    ]);
  });

  it('adds a folder for entries whose folder is not among them, whatever their order', () => {
    const tree = buildTree([file('f', 'a/f.yaml'), folder('a', 'a')]);

    expect(tree).toEqual([
      {
        id: 'a',
        path: 'a',
        name: 'a',
        type: 'folder',
        children: [{ id: 'f', path: 'a/f.yaml', name: 'f.yaml', type: 'document' }],
      },
    ]);
    expect(buildTree([file('f', 'x/f.yaml')])[0]).toMatchObject({ path: 'x', type: 'folder' });
  });

  it('returns an empty tree for no entries', () => {
    expect(buildTree([])).toEqual([]);
  });
});
