import { describe, expect, it } from 'vitest';

import { DocumentService } from '../../services/document/document.service';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { MaxOccursType } from '../../xml-schema-ts/constants';
import { IField } from './document';
import { FieldCardinality, Occurrence } from './field-cardinality';

describe('Occurrence', () => {
  it('should keep the minOccurs and maxOccurs it is given', () => {
    const occurrence = new Occurrence(0, 'unbounded');

    expect(occurrence.minOccurs).toBe(0);
    expect(occurrence.maxOccurs).toBe('unbounded');
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
      expect(Occurrence.isCollection({ maxOccurs })).toBe(expected);
      expect(new Occurrence(1, maxOccurs).isCollection).toBe(expected);
    });

    it('should not treat a field with minOccurs 0 and maxOccurs 0 as a collection', () => {
      expect(Occurrence.isCollection({ maxOccurs: 0 })).toBe(false);
      expect(new Occurrence(0, 0).isCollection).toBe(false);
    });

    it('should give the same answer for a spread copy of a parsed field as for the field itself', () => {
      const shipOrder = TestUtil.createSourceOrderDoc().fields[0];
      const found = shipOrder.fields.find((field) => field.name === 'Item');
      expect(found).toBeDefined();
      const item = found as IField;
      const copy = { ...item } as IField;

      expect(Object.getPrototypeOf(copy)).not.toBe(Object.getPrototypeOf(item));
      expect(Occurrence.isCollection(item)).toBe(true);
      expect(Occurrence.isCollection(copy)).toBe(true);
      expect(DocumentService.getCardinality(copy)).toEqual(DocumentService.getCardinality(item));
    });
  });
});

describe('FieldCardinality', () => {
  it('should keep the own and effective occurrence it is given', () => {
    const own = new Occurrence(1, 5);
    const effective = new Occurrence(0, 15);
    const cardinality = new FieldCardinality(own, effective);

    expect(cardinality.own).toBe(own);
    expect(cardinality.effective).toBe(effective);
  });

  describe('isRepeating', () => {
    it('should read the effective occurrence, not the own one', () => {
      expect(new FieldCardinality(new Occurrence(1, 1), new Occurrence(0, 'unbounded')).isRepeating).toBe(true);
      expect(new FieldCardinality(new Occurrence(2, 2), new Occurrence(4, 12)).isRepeating).toBe(true);
    });

    it('should be false for a single field', () => {
      const single = new Occurrence(1, 1);
      expect(new FieldCardinality(single, single).isRepeating).toBe(false);
    });
  });
});
