import { isRawString } from './is-raw-string';

describe('isRawString', () => {
  it('should return true for a valid RAW string', () => {
    expect(isRawString('RAW(some value)')).toBe(true);
  });

  it('should return false for a string not starting with RAW(', () => {
    expect(isRawString('raw(some value)')).toBe(false);
    expect(isRawString('SOMETHING(some value)')).toBe(false);
    expect(isRawString('(some value)')).toBe(false);
  });

  it('should return false for a string not ending with )', () => {
    expect(isRawString('RAW(some value')).toBe(false);
    expect(isRawString('RAW(some value]')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(isRawString(null)).toBe(false);
    expect(isRawString(undefined)).toBe(false);
    expect(isRawString(123)).toBe(false);
    expect(isRawString({})).toBe(false);
    expect(isRawString([])).toBe(false);
    expect(isRawString(true)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isRawString('')).toBe(false);
  });

  it('should return true for RAW() (empty content)', () => {
    expect(isRawString('RAW()')).toBe(true);
  });

  it('should return false for RAW( without closing parenthesis', () => {
    expect(isRawString('RAW(')).toBe(false);
  });

  it('should return false for )RAW(some value)', () => {
    expect(isRawString(')RAW(some value)')).toBe(false);
  });
});
