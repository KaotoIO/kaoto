import { capitalizeString } from './capitalize-string';

describe('capitalize', () => {
  it('should capitalize the first letter of a string', () => {
    expect(capitalizeString('hello')).toBe('Hello');
  });

  it('should return an empty string if the input is empty', () => {
    expect(capitalizeString('')).toBe('');
  });

  it('should return the same string if the first letter is already capitalized', () => {
    expect(capitalizeString('Hello')).toBe('Hello');
  });

  it('should the remaining text is is already uppercase', () => {
    expect(capitalizeString('HELLO')).toBe('HELLO');
  });
});
