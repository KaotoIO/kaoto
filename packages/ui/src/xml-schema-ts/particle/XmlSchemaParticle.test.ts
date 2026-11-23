import { XmlSchemaParticle } from './XmlSchemaParticle';

describe('XmlSchemaParticle', () => {
  describe('parseMaxOccurs()', () => {
    it.each([
      ['unbounded', 'unbounded'],
      [' unbounded ', 'unbounded'],
      ['0', 0],
      ['1', 1],
      ['+3', 3],
      ['007', 7],
      [' 2 ', 2],
      ['\t\r\n2\n', 2],
      ['-0', 0],
    ])('accepts "%s"', (value, expected) => {
      expect(XmlSchemaParticle.parseMaxOccurs(value)).toBe(expected);
    });

    it.each(['abc', '-1', '1.5', '2.0', '3abc', '', 'UNBOUNDED', '1 2', '\u00A00\u00A0', '\u00A0unbounded'])(
      'rejects "%s"',
      (value) => {
        expect(XmlSchemaParticle.parseMaxOccurs(value)).toBeNull();
      },
    );
  });

  describe('parseMinOccurs()', () => {
    it.each([
      ['0', 0],
      ['1', 1],
      ['+3', 3],
      ['007', 7],
      [' 2 ', 2],
      ['-0', 0],
    ])('accepts "%s"', (value, expected) => {
      expect(XmlSchemaParticle.parseMinOccurs(value)).toBe(expected);
    });

    it.each(['unbounded', 'abc', '-1', '1.5', '2.0', '3abc', '', '\u00A01', '1\u2003'])('rejects "%s"', (value) => {
      expect(XmlSchemaParticle.parseMinOccurs(value)).toBeNull();
    });
  });
});
