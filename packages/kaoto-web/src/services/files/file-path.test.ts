import { buildChildPath, buildFilePath, buildRenamedPath } from './file-path';

describe('buildFilePath', () => {
  it.each([
    ['', 'orders', 'orders.camel.yaml'],
    ['routes', 'orders', 'routes/orders.camel.yaml'],
    ['routes/async', 'orders.camel.yaml', 'routes/async/orders.camel.yaml'],
    ['/routes//async/', 'orders', 'routes/async/orders.camel.yaml'],
    [' routes / async ', ' orders ', 'routes/async/orders.camel.yaml'],
    ['   ', 'orders', 'orders.camel.yaml'],
  ])('builds the path from the folder %j and the name %j', (folder, name, path) => {
    expect(buildFilePath(folder, name, '.camel.yaml')).toEqual({ path });
  });

  it('appends the extension to a name with another extension', () => {
    expect(buildFilePath('', 'orders.yaml', '.camel.yaml')).toEqual({ path: 'orders.yaml.camel.yaml' });
  });

  it.each(['', '   ', '.camel.yaml', '.', '..'])('rejects the name %j', (name) => {
    expect(buildFilePath('', name, '.camel.yaml')).toEqual({ field: 'name', error: 'Enter a file name' });
  });

  it.each(['routes/orders', 'routes\\orders'])('asks for the folder in its own field for the name %j', (name) => {
    expect(buildFilePath('', name, '.camel.yaml')).toEqual({
      field: 'name',
      error: 'Enter the folder in the folder field',
    });
  });

  it.each(['../routes', 'routes/./async', 'routes\\async'])('rejects the folder %j', (folder) => {
    expect(buildFilePath(folder, 'orders', '.camel.yaml')).toEqual({
      field: 'folder',
      error: 'Use a folder path such as routes/orders',
    });
  });
});

describe('buildRenamedPath', () => {
  it.each([
    ['orders.camel.yaml', 'payments.camel.yaml', 'payments.camel.yaml'],
    ['routes/async/orders.camel.yaml', ' payments.camel.yaml ', 'routes/async/payments.camel.yaml'],
    ['routes/orders.camel.yaml', 'orders.yaml', 'routes/orders.yaml'],
  ])('renames %j to %j in its folder', (path, name, renamed) => {
    expect(buildRenamedPath(path, name)).toEqual({ path: renamed });
  });

  it.each(['', '   ', '.', '..'])('rejects the name %j', (name) => {
    expect(buildRenamedPath('routes/orders.camel.yaml', name)).toEqual({ error: 'Enter a file name' });
  });

  it.each(['async/orders.camel.yaml', 'async\\orders.camel.yaml'])('rejects the name %j with a separator', (name) => {
    expect(buildRenamedPath('routes/orders.camel.yaml', name)).toEqual({
      error: 'A file name cannot contain / or \\',
    });
  });
});

describe('buildChildPath', () => {
  it.each([
    ['', 'orders.camel.yaml', 'orders.camel.yaml'],
    ['routes/async', ' orders.camel.yaml ', 'routes/async/orders.camel.yaml'],
    ['routes', 'async', 'routes/async'],
  ])('puts a child of %j named %j at %j', (folderPath, name, path) => {
    expect(buildChildPath(folderPath, name, 'file')).toEqual({ path });
  });

  it.each([
    ['file', 'Enter a file name', 'A file name cannot contain / or \\'],
    ['folder', 'Enter a folder name', 'A folder name cannot contain / or \\'],
  ] as const)('names the %s in its errors', (kind, empty, separator) => {
    for (const name of ['', '   ', '.', '..']) expect(buildChildPath('routes', name, kind)).toEqual({ error: empty });
    for (const name of ['a/b', 'a\\b']) expect(buildChildPath('routes', name, kind)).toEqual({ error: separator });
  });
});
