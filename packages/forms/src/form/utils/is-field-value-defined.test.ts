import { isFieldValueDefined } from './is-field-value-defined';

describe('isFieldValueDefined', () => {
  describe('when value is undefined or null', () => {
    expect(isFieldValueDefined('string', undefined)).toBe(false);
    expect(isFieldValueDefined('object', null)).toBe(false);
  });

  describe('when schema type is object', () => {
    it('should return true for non-empty object', () => {
      expect(isFieldValueDefined('object', { key: 'value' })).toBe(true);
      expect(isFieldValueDefined('object', { a: 1, b: 2 })).toBe(true);
    });

    it('should return false for empty object', () => {
      expect(isFieldValueDefined('object', {})).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isFieldValueDefined('object', 'string')).toBe(false);
      expect(isFieldValueDefined('object', 123)).toBe(false);
      expect(isFieldValueDefined('object', true)).toBe(false);
      expect(isFieldValueDefined('object', [])).toBe(false);
    });
  });

  describe('when schema type is array', () => {
    it('should return true for non-empty array', () => {
      expect(isFieldValueDefined('array', [1, 2, 3])).toBe(true);
      expect(isFieldValueDefined('array', ['a', 'b'])).toBe(true);
      expect(isFieldValueDefined('array', [{ key: 'value' }])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(isFieldValueDefined('array', [])).toBe(false);
    });

    it('should return false for non-array values', () => {
      expect(isFieldValueDefined('array', 'string')).toBe(false);
      expect(isFieldValueDefined('array', 123)).toBe(false);
      expect(isFieldValueDefined('array', {})).toBe(false);
      expect(isFieldValueDefined('array', true)).toBe(false);
    });
  });

  describe('when schema type is boolean', () => {
    it('should return true for boolean values', () => {
      expect(isFieldValueDefined('boolean', true)).toBe(true);
      expect(isFieldValueDefined('boolean', false)).toBe(true);
    });

    it('should return true for non-boolean values', () => {
      expect(isFieldValueDefined('boolean', 'true')).toBe(true);
      expect(isFieldValueDefined('boolean', 1)).toBe(true);
      expect(isFieldValueDefined('boolean', 0)).toBe(true);
      expect(isFieldValueDefined('boolean', '{{ app.property }}')).toBe(true);
      expect(isFieldValueDefined('boolean', {})).toBe(true);
      expect(isFieldValueDefined('boolean', [])).toBe(true);
    });
  });

  describe('when schema type is string', () => {
    it('should return true for non-empty strings', () => {
      expect(isFieldValueDefined('string', 'hello')).toBe(true);
      expect(isFieldValueDefined('string', ' ')).toBe(true);
      expect(isFieldValueDefined('string', '0')).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isFieldValueDefined('string', '')).toBe(true);
    });

    it('should return true for non-string values that are not empty strings', () => {
      expect(isFieldValueDefined('string', 123)).toBe(true);
      expect(isFieldValueDefined('string', true)).toBe(true);
      expect(isFieldValueDefined('string', {})).toBe(true);
      expect(isFieldValueDefined('string', [])).toBe(true);
    });
  });

  describe('when schema type is number', () => {
    it('should return true for non-empty string numbers', () => {
      expect(isFieldValueDefined('number', '123')).toBe(true);
      expect(isFieldValueDefined('number', '0')).toBe(true);
      expect(isFieldValueDefined('number', '3.14')).toBe(true);
      expect(isFieldValueDefined('number', 45)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isFieldValueDefined('number', '')).toBe(true);
    });

    it('should return true for non-string values that are not empty strings', () => {
      expect(isFieldValueDefined('number', 123)).toBe(true);
      expect(isFieldValueDefined('number', true)).toBe(true);
      expect(isFieldValueDefined('number', {})).toBe(true);
      expect(isFieldValueDefined('number', [])).toBe(true);
    });
  });

  describe('when schema type is undefined or unknown', () => {
    it('should return true for any defined value', () => {
      expect(isFieldValueDefined(undefined, 'hello')).toBe(true);
      expect(isFieldValueDefined(undefined, 123)).toBe(true);
      expect(isFieldValueDefined(undefined, true)).toBe(true);
      expect(isFieldValueDefined(undefined, {})).toBe(true);
      expect(isFieldValueDefined(undefined, [])).toBe(true);
      expect(isFieldValueDefined(undefined, '')).toBe(true);
    });
  });
});
