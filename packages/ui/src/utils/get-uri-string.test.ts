import { getUriString } from './get-uri-string';

describe('getUriString', () => {
  it.each([
    [undefined, undefined],
    [null, undefined],
    [88, undefined],
    [true, undefined],
    [false, undefined],
    ['', undefined],
    [{ uri: '' }, undefined],
    [{ uri: undefined }, undefined],
    [{ uri: null }, undefined],
    [{ uri: 88 }, undefined],
    [{ uri: {} }, undefined],
    ['a string', 'a string'],
    [{ uri: 'a string' }, 'a string'],
  ])('should return `%s` for `%s`', (value, expected) => {
    expect(getUriString(value)).toBe(expected);
  });
});
