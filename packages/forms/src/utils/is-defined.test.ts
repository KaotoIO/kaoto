import { isDefined } from './is-defined';

describe('isDefined', () => {
  it.each([
    [undefined, false],
    [null, false],
    ['', true],
    [' ', true],
    ['a', true],
    [0, true],
    [1, true],
    [false, true],
    [true, true],
    [{}, true],
    [[], true],
    [() => {}, true],
  ])('should return `%s` for `%s`', (value, expected) => {
    expect(isDefined(value)).toBe(expected);
  });
});
