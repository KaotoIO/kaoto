import { getTileKey } from './Catalog.models';

describe('getTileKey', () => {
  it('combines name and type', () => {
    expect(getTileKey({ name: 'log', type: 'component' })).toBe('log-component');
  });

  it('differentiates tiles with the same name and different type', () => {
    expect(getTileKey({ name: 'log', type: 'component' })).not.toBe(getTileKey({ name: 'log', type: 'processor' }));
  });

  it('encodes whitespace so the key is a single DOM id token', () => {
    const key = getTileKey({ name: 'my kamelet', type: 'kamelet' });

    expect(key).not.toMatch(/\s/);
    expect(key).toBe('my%20kamelet-kamelet');
  });

  it('does not produce the same key for names that only differ by the delimiter position', () => {
    expect(getTileKey({ name: 'a b', type: 'c' })).not.toBe(getTileKey({ name: 'a', type: 'b c' }));
  });
});
