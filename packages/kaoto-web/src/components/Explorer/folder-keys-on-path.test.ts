import { getFolderKeysOnPath } from './folder-keys-on-path';

const entries = [
  { key: 'k-routes', path: 'routes' },
  { key: 'k-orders', path: 'routes/orders' },
  { key: 'k-file', path: 'routes/orders/a.camel.yaml' },
  { key: 'k-routes2', path: 'routes2' },
  { key: 'k-deep', path: 'implicit/deep' },
];

describe('getFolderKeysOnPath', () => {
  it.each([
    ['', []],
    ['routes', ['k-routes']],
    ['routes/orders', ['k-routes', 'k-orders']],
    ['routes2', ['k-routes2']],
  ])('takes the keys of the folders on %j, outermost first', (folderPath, keys) => {
    expect(getFolderKeysOnPath(entries, folderPath)).toEqual(keys);
  });

  it('skips a folder that is not among the entries', () => {
    expect(getFolderKeysOnPath(entries, 'implicit/deep')).toEqual(['k-deep']);
  });
});
