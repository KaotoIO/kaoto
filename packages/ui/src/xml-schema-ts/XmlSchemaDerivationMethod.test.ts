import { XmlSchemaDerivationMethod } from './XmlSchemaDerivationMethod';

describe('XmlSchemaDerivationMethod', () => {
  describe('schemaValueOf', () => {
    it('should return method with no flags for empty string', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('');
      expect(method.isNone()).toBe(true);
    });

    it('should set multiple flags for space-separated tokens', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('extension restriction');
      expect(method.isExtension()).toBe(true);
      expect(method.isRestriction()).toBe(true);
      expect(method.isList()).toBe(false);
    });

    it('should handle extra whitespace between tokens', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('  extension   restriction  ');
      expect(method.isExtension()).toBe(true);
      expect(method.isRestriction()).toBe(true);
    });

    it('should set all flag for "#all" token', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('#all');
      expect(method.isAll()).toBe(true);
      expect(method.isExtension()).toBe(false);
    });

    it('should set all flag for case-insensitive "#ALL" token', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('#ALL');
      expect(method.isAll()).toBe(true);
      expect(method.isExtension()).toBe(false);
    });

    it('should set all flag for bare "ALL" token', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('ALL');
      expect(method.isAll()).toBe(true);
      expect(method.isExtension()).toBe(false);
    });

    it('should throw when "#all" conflicts with other tokens after it', () => {
      expect(() => XmlSchemaDerivationMethod.schemaValueOf('extension #all')).toThrow(
        'Derivation method cannot be #all and something else.',
      );
    });

    it('should throw when other tokens come after "#all"', () => {
      expect(() => XmlSchemaDerivationMethod.schemaValueOf('#all extension')).toThrow(
        'Derivation method cannot be #all and something else.',
      );
    });

    it('should set list flag for "list" token', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('list');
      expect(method.isList()).toBe(true);
      expect(method.isExtension()).toBe(false);
    });

    it('should set substitution flag for "substitution" token', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('substitution');
      expect(method.isSubstitution()).toBe(true);
      expect(method.isExtension()).toBe(false);
    });

    it('should set union flag for "union" token', () => {
      const method = XmlSchemaDerivationMethod.schemaValueOf('union');
      expect(method.isUnion()).toBe(true);
      expect(method.isExtension()).toBe(false);
    });
  });
});
