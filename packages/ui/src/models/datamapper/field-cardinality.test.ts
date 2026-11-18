import { describe, expect, it } from 'vitest';

import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { MaxOccursType } from '../../xml-schema-ts/constants';
import { IField } from './document';
import { FieldCardinality } from './field-cardinality';

describe('FieldCardinality', () => {
  describe('of()', () => {
    it('should read minOccurs and maxOccurs from the field', () => {
      const cardinality = FieldCardinality.of({ minOccurs: 0, maxOccurs: 'unbounded' });

      expect(cardinality.minOccurs).toBe(0);
      expect(cardinality.maxOccurs).toBe('unbounded');
    });

    it('should give the same answer for a spread copy of a parsed field as for the field itself', () => {
      const shipOrder = TestUtil.createSourceOrderDoc().fields[0];
      const found = shipOrder.fields.find((field) => field.name === 'Item');
      expect(found).toBeDefined();
      const item = found as IField;
      const copy = { ...item } as IField;

      expect(Object.getPrototypeOf(copy)).not.toBe(Object.getPrototypeOf(item));
      expect(FieldCardinality.of(item).isCollection).toBe(true);
      expect(FieldCardinality.of(copy).isCollection).toBe(true);
      expect(FieldCardinality.of(copy).minOccurs).toBe(FieldCardinality.of(item).minOccurs);
      expect(FieldCardinality.isCollection(item)).toBe(true);
      expect(FieldCardinality.isCollection(copy)).toBe(true);
    });
  });

  describe('isCollection', () => {
    it.each<[MaxOccursType, boolean]>([
      [1, false],
      [0, false],
      [Number.NaN, false],
      [2, true],
      ['unbounded', true],
      [5, true],
      [Number.MAX_SAFE_INTEGER, true],
    ])('should return for maxOccurs %s: %s', (maxOccurs, expected) => {
      expect(FieldCardinality.isCollection({ maxOccurs })).toBe(expected);
      expect(FieldCardinality.of({ minOccurs: 1, maxOccurs }).isCollection).toBe(expected);
    });

    it('should not treat a field with minOccurs 0 and maxOccurs 0 as a collection', () => {
      expect(FieldCardinality.isCollection({ maxOccurs: 0 })).toBe(false);
      expect(FieldCardinality.of({ minOccurs: 0, maxOccurs: 0 }).isCollection).toBe(false);
    });
  });
});
