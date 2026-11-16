import { buildFilePath } from './file-path';

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
