import { XmlSchemaNamedImpl } from './XmlSchemaNamedImpl';
import { XmlSchema } from '../XmlSchema';
import { QName } from '../QName';
import { XmlSchemaRefBase } from './XmlSchemaRefBase';

// Mock XmlSchemaRefBase for testing
class MockRefBase extends XmlSchemaRefBase {
  protected forgetTargetObject(): void {
    // Mock implementation
  }
}

describe('XmlSchemaNamedImpl', () => {
  let schema: XmlSchema;

  beforeEach(() => {
    schema = new XmlSchema('http://test.example.com');
  });

  describe('constructor', () => {
    it('should create named object with parent schema', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.getParent()).toBe(schema);
      expect(named.isTopLevel()).toBe(false);
    });

    it('should create top-level named object', () => {
      const named = new XmlSchemaNamedImpl(schema, true);

      expect(named.isTopLevel()).toBe(true);
    });

    it('should initialize as anonymous', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.isAnonymous()).toBe(true);
      expect(named.getName()).toBeNull();
      expect(named.getQName()).toBeNull();
    });
  });

  describe('setName and getName', () => {
    it('should set and get name', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('testElement');

      expect(named.getName()).toBe('testElement');
      expect(named.isAnonymous()).toBe(false);
    });

    it('should create QName with schema target namespace', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('testElement');

      const qname = named.getQName();
      expect(qname).not.toBeNull();
      expect(qname?.getLocalPart()).toBe('testElement');
      expect(qname?.getNamespaceURI()).toBe('http://test.example.com');
    });

    it('should allow setting name to null', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('testElement');
      named.setName(null);

      expect(named.getName()).toBeNull();
      expect(named.isAnonymous()).toBe(true);
      expect(named.getQName()).toBeNull();
    });

    it('should throw error when setting empty string as name', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(() => named.setName('')).toThrow('Attempt to set empty name.');
    });

    it('should allow changing name', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('firstName');
      named.setName('secondName');

      expect(named.getName()).toBe('secondName');
      expect(named.getQName()?.getLocalPart()).toBe('secondName');
    });
  });

  describe('isAnonymous', () => {
    it('should return true for newly created object', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.isAnonymous()).toBe(true);
    });

    it('should return false after setting name', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('testName');

      expect(named.isAnonymous()).toBe(false);
    });

    it('should return true after setting name to null', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('testName');
      named.setName(null);

      expect(named.isAnonymous()).toBe(true);
    });
  });

  describe('getParent', () => {
    it('should return parent schema', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.getParent()).toBe(schema);
    });

    it('should return same parent throughout lifetime', () => {
      const named = new XmlSchemaNamedImpl(schema, true);
      named.setName('test');

      expect(named.getParent()).toBe(schema);
    });
  });

  describe('getQName', () => {
    it('should return null for anonymous object', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.getQName()).toBeNull();
    });

    it('should return QName with correct namespace and local part', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('testElement');

      const qname = named.getQName();
      expect(qname).toBeInstanceOf(QName);
      expect(qname?.getNamespaceURI()).toBe('http://test.example.com');
      expect(qname?.getLocalPart()).toBe('testElement');
    });

    it('should update QName when name changes', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('firstName');
      const qname1 = named.getQName();

      named.setName('secondName');
      const qname2 = named.getQName();

      expect(qname1?.getLocalPart()).toBe('firstName');
      expect(qname2?.getLocalPart()).toBe('secondName');
    });
  });

  describe('isTopLevel', () => {
    it('should return true for top-level object', () => {
      const named = new XmlSchemaNamedImpl(schema, true);

      expect(named.isTopLevel()).toBe(true);
    });

    it('should return false for nested object', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.isTopLevel()).toBe(false);
    });

    it('should maintain top-level status after setting name', () => {
      const topLevel = new XmlSchemaNamedImpl(schema, true);
      const nested = new XmlSchemaNamedImpl(schema, false);

      topLevel.setName('topElement');
      nested.setName('nestedElement');

      expect(topLevel.isTopLevel()).toBe(true);
      expect(nested.isTopLevel()).toBe(false);
    });
  });

  describe('setRefObject and ref validation', () => {
    it('should throw error when setting name on object with ref', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      const refBase = new MockRefBase();
      refBase.setTargetQName(new QName('http://test.example.com', 'refTarget'));

      named.setRefObject(refBase);

      expect(() => named.setName('newName')).toThrow("Attempt to set name on object with ref='xxx'");
    });

    it('should allow setting name when ref is null', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      const refBase = new MockRefBase();

      named.setRefObject(refBase);
      named.setName('newName');

      expect(named.getName()).toBe('newName');
    });

    it('should allow setting ref object when name is null', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      const refBase = new MockRefBase();
      refBase.setTargetQName(new QName('http://test.example.com', 'refTarget'));

      expect(() => named.setRefObject(refBase)).not.toThrow();
    });

    it('should allow setting name to null when ref exists', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      const refBase = new MockRefBase();
      refBase.setTargetQName(new QName('http://test.example.com', 'refTarget'));

      named.setRefObject(refBase);

      expect(() => named.setName(null)).not.toThrow();
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple schemas with different namespaces', () => {
      const schema1 = new XmlSchema('http://schema1.example.com');
      const schema2 = new XmlSchema('http://schema2.example.com');

      const named1 = new XmlSchemaNamedImpl(schema1, false);
      const named2 = new XmlSchemaNamedImpl(schema2, false);

      named1.setName('element');
      named2.setName('element');

      expect(named1.getQName()?.getNamespaceURI()).toBe('http://schema1.example.com');
      expect(named2.getQName()?.getNamespaceURI()).toBe('http://schema2.example.com');
      expect(named1.getQName()?.getLocalPart()).toBe('element');
      expect(named2.getQName()?.getLocalPart()).toBe('element');
    });

    it('should handle lifecycle: anonymous -> named -> anonymous', () => {
      const named = new XmlSchemaNamedImpl(schema, false);

      expect(named.isAnonymous()).toBe(true);

      named.setName('element');
      expect(named.isAnonymous()).toBe(false);
      expect(named.getName()).toBe('element');

      named.setName(null);
      expect(named.isAnonymous()).toBe(true);
      expect(named.getName()).toBeNull();
    });

    it('should handle top-level and nested objects with same name', () => {
      const topLevel = new XmlSchemaNamedImpl(schema, true);
      const nested = new XmlSchemaNamedImpl(schema, false);

      topLevel.setName('sameElement');
      nested.setName('sameElement');

      expect(topLevel.getQName()?.getLocalPart()).toBe('sameElement');
      expect(nested.getQName()?.getLocalPart()).toBe('sameElement');
      expect(topLevel.isTopLevel()).toBe(true);
      expect(nested.isTopLevel()).toBe(false);
    });
  });
});
