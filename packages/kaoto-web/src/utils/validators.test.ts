import { describe, expect, it } from 'vitest';

import {
  hasRequiredProperties,
  isInRange,
  isNonNegativeNumber,
  isNotEmpty,
  isPositiveNumber,
  isValidIntegrationId,
  isValidPolicyName,
  isValidPropertyKey,
  isValidRouteId,
  isValidUrl,
} from './validators';

describe('validators', () => {
  describe('isNotEmpty', () => {
    it.each([
      ['text', true],
      ['  padded  ', true],
      ['', false],
      ['   ', false],
      [null, false],
      [undefined, false],
    ])('isNotEmpty(%j) should be %s', (value, expected) => {
      expect(isNotEmpty(value)).toBe(expected);
    });
  });

  describe.each([
    ['isValidIntegrationId', isValidIntegrationId],
    ['isValidRouteId', isValidRouteId],
    ['isValidPolicyName', isValidPolicyName],
  ])('%s', (_name, validator) => {
    it.each([
      ['my-id_01', true],
      ['ABC', true],
      ['', false],
      [null, false],
      [undefined, false],
      ['with space', false],
      ['with.dot', false],
      ['with/slash', false],
    ])('(%j) should be %s', (value, expected) => {
      expect(validator(value)).toBe(expected);
    });
  });

  describe('isValidPropertyKey', () => {
    it.each([
      ['camel.main.name', true],
      ['my-key_01', true],
      ['', false],
      [null, false],
      [undefined, false],
      ['with space', false],
      ['with/slash', false],
    ])('isValidPropertyKey(%j) should be %s', (value, expected) => {
      expect(isValidPropertyKey(value)).toBe(expected);
    });
  });

  describe('hasRequiredProperties', () => {
    it('should return true when all the required keys have a value', () => {
      expect(hasRequiredProperties({ a: 'x', b: 0, c: false }, ['a', 'b', 'c'])).toBe(true);
    });

    it.each([
      ['null', { a: null }],
      ['undefined', { a: undefined }],
      ['an empty string', { a: '' }],
    ])('should return false when a required key is %s', (_label, obj) => {
      expect(hasRequiredProperties(obj, ['a'])).toBe(false);
    });

    it('should return true when there are no required keys', () => {
      expect(hasRequiredProperties({ a: null }, [])).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it.each([
      ['https://kaoto.io/docs/', true],
      ['http://localhost:8080', true],
      ['not a url', false],
      ['', false],
      [null, false],
      [undefined, false],
    ])('isValidUrl(%j) should be %s', (value, expected) => {
      expect(isValidUrl(value)).toBe(expected);
    });
  });

  describe('isInRange', () => {
    it.each([
      [5, 1, 10, true],
      [1, 1, 10, true],
      [10, 1, 10, true],
      [0, 1, 10, false],
      [11, 1, 10, false],
    ])('isInRange(%d, %d, %d) should be %s', (value, min, max, expected) => {
      expect(isInRange(value, min, max)).toBe(expected);
    });
  });

  describe('isPositiveNumber', () => {
    it.each([
      [1, true],
      [0.1, true],
      [0, false],
      [-1, false],
      [null, false],
      [undefined, false],
    ])('isPositiveNumber(%j) should be %s', (value, expected) => {
      expect(isPositiveNumber(value)).toBe(expected);
    });
  });

  describe('isNonNegativeNumber', () => {
    it.each([
      [1, true],
      [0, true],
      [-1, false],
      [null, false],
      [undefined, false],
    ])('isNonNegativeNumber(%j) should be %s', (value, expected) => {
      expect(isNonNegativeNumber(value)).toBe(expected);
    });
  });
});
