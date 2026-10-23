import { camelCaseToSpaces } from './camel-case-to-space';

describe('camelCaseToSpaces', () => {
  it('should convert camelCase to space separated string', () => {
    expect(camelCaseToSpaces('camelCaseString')).toBe('camel Case String');
  });

  it('should return an empty string if input is empty', () => {
    expect(camelCaseToSpaces('')).toBe('');
  });

  it('should handle single word strings', () => {
    expect(camelCaseToSpaces('word')).toBe('word');
  });

  it('should capitalize words if the capitalize option is true', () => {
    expect(camelCaseToSpaces('camelCaseString', { capitalize: true })).toBe('Camel Case String');
  });

  it('should not capitalize words if the capitalize option is false', () => {
    expect(camelCaseToSpaces('camelCaseString', { capitalize: false })).toBe('camel Case String');
  });

  it('should ignore strings with multiple uppercase letters', () => {
    expect(camelCaseToSpaces('thisIsATestString')).toBe('this Is ATest String');
  });

  it('should handle strings with no uppercase letters', () => {
    expect(camelCaseToSpaces('teststring')).toBe('teststring');
  });

  it('should handle strings with leading uppercase letters', () => {
    expect(camelCaseToSpaces('TestString')).toBe('Test String');
  });

  it('should handle strings with trailing uppercase letters', () => {
    expect(camelCaseToSpaces('testStringA')).toBe('test String A');
  });
});
