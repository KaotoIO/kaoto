import { isSameArray } from './is-same-array';

describe('isSameArray', () => {
  it('should return true for arrays with the same elements in the same order', () => {
    expect(isSameArray([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('should return true for arrays with the same elements in a different order', () => {
    expect(isSameArray([1, 2, 3], [3, 2, 1])).toBe(true);
  });

  it('should return false for arrays with different elements', () => {
    expect(isSameArray([1, 2, 3], [4, 5, 6])).toBe(false);
  });

  it('should return false for arrays with different lengths', () => {
    expect(isSameArray([1, 2, 3], [1, 2])).toBe(false);
  });

  it('should return true for empty arrays', () => {
    expect(isSameArray([], [])).toBe(true);
  });

  it('should return false if one array is empty and the other is not', () => {
    expect(isSameArray([], [1, 2, 3])).toBe(false);
    expect(isSameArray([1, 2, 3], [])).toBe(false);
  });

  it('should handle arrays with different types of elements', () => {
    expect(isSameArray([1, '2', 'true'], ['true', '2', 1])).toBe(true);
    expect(isSameArray([1, '2', 'true'], [1, '2', 'false'])).toBe(false);
  });
});
