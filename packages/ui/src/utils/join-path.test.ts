import { getJoinPath } from './join-path';

describe('getJoinPath', () => {
  it('should return a joined string with hyphens for a valid array of strings', () => {
    const result = getJoinPath(['home', 'user', 'documents']);
    expect(result).toBe('home-user-documents');
  });

  it('should return an empty string if the array is empty', () => {
    const result = getJoinPath([]);
    expect(result).toBe('');
  });

  it('should handle an array with one element correctly', () => {
    const result = getJoinPath(['single']);
    expect(result).toBe('single');
  });

  it('should handle an array with multiple elements correctly', () => {
    const result = getJoinPath(['a', 'b', 'c']);
    expect(result).toBe('a-b-c');
  });

  it('should handle an array with empty strings correctly', () => {
    const result = getJoinPath(['a', '', 'c']);
    expect(result).toBe('a--c');
  });
});
