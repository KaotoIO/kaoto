import { getParsedValue } from './get-parsed-value';

describe('getParsedValue', () => {
  it.each([
    ['true', true],
    ['false', false],
    [undefined, ''],
    ['undefined', 'undefined'],
    ['1', 1],
    ['0', 0],
    ['1.5', 1.5],
    ['0.5', 0.5],
    ['foo', 'foo'],
    ['', ''],
  ])('should return `%s` for `%s`', (value, expected) => {
    expect(getParsedValue(value)).toBe(expected);
  });
});
