import { XmlSchemaRefBase } from './XmlSchemaRefBase';
import { XmlSchema } from '../XmlSchema';
import { QName } from '../QName';
import { XmlSchemaNamedImpl } from './XmlSchemaNamedImpl';

// Concrete implementation for testing
class TestXmlSchemaRefBase extends XmlSchemaRefBase {
  private targetObject: unknown = null;

  protected forgetTargetObject(): void {
    this.targetObject = null;
  }

  // Expose protected members for testing
  getParent(): XmlSchema | null {
    return this.parent;
  }

  setParent(parent: XmlSchema | null): void {
    this.parent = parent;
  }

  getTargetObject(): unknown {
    return this.targetObject;
  }

  setTargetObject(obj: unknown): void {
    this.targetObject = obj;
  }
}

describe('XmlSchemaRefBase', () => {
  let schema: XmlSchema;
  let refBase: TestXmlSchemaRefBase;

  beforeEach(() => {
    schema = new XmlSchema('http://test.example.com');
    refBase = new TestXmlSchemaRefBase();
  });

  describe('getTargetQName', () => {
    it('should return null when no target QName is set', () => {
      expect(refBase.getTargetQName()).toBeNull();
    });

    it('should return target QName after it is set', () => {
      const qname = new QName('http://test.example.com', 'testElement');
      refBase.setTargetQName(qname);

      expect(refBase.getTargetQName()).toBe(qname);
    });

    it('should return updated QName after changing it', () => {
      const qname1 = new QName('http://test.example.com', 'element1');
      const qname2 = new QName('http://test.example.com', 'element2');

      refBase.setTargetQName(qname1);
      expect(refBase.getTargetQName()).toBe(qname1);

      refBase.setTargetQName(qname2);
      expect(refBase.getTargetQName()).toBe(qname2);
    });
  });

  describe('setTargetQName', () => {
    it('should set target QName successfully', () => {
      const qname = new QName('http://test.example.com', 'testElement');
      refBase.setTargetQName(qname);

      expect(refBase.getTargetQName()).toBe(qname);
    });

    it('should call forgetTargetObject when setting new target QName', () => {
      refBase.setTargetObject('someObject');
      expect(refBase.getTargetObject()).toBe('someObject');

      const qname = new QName('http://test.example.com', 'testElement');
      refBase.setTargetQName(qname);

      expect(refBase.getTargetObject()).toBeNull();
    });

    it('should throw error when changing ref on named object with name', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      refBase.setNamedObject(named);

      // Set initial ref while anonymous
      const qname1 = new QName('http://test.example.com', 'firstRef');
      refBase.setTargetQName(qname1);

      // Now set name
      named.setName('existingName');

      // Try to change ref - should fail
      const qname2 = new QName('http://test.example.com', 'secondRef');
      expect(() => refBase.setTargetQName(qname2)).toThrow(
        'It is invalid to set the ref= name for an item that has a name.',
      );
    });

    it('should allow setting ref when named object is anonymous', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      refBase.setNamedObject(named);

      const qname = new QName('http://test.example.com', 'refTarget');

      expect(() => refBase.setTargetQName(qname)).not.toThrow();
      expect(refBase.getTargetQName()).toBe(qname);
    });

    it('should allow setting ref when named object has null name', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      named.setName('tempName');
      named.setName(null);

      refBase.setNamedObject(named);
      const qname = new QName('http://test.example.com', 'refTarget');

      expect(() => refBase.setTargetQName(qname)).not.toThrow();
    });

    it('should allow changing ref when already set', () => {
      const qname1 = new QName('http://test.example.com', 'ref1');
      const qname2 = new QName('http://test.example.com', 'ref2');

      refBase.setTargetQName(qname1);
      expect(refBase.getTargetQName()).toBe(qname1);

      refBase.setTargetQName(qname2);
      expect(refBase.getTargetQName()).toBe(qname2);
    });
  });

  describe('setNamedObject', () => {
    it('should set named object successfully', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      refBase.setNamedObject(named);

      // Should not throw when setting ref on anonymous object
      const qname = new QName('http://test.example.com', 'refTarget');
      expect(() => refBase.setTargetQName(qname)).not.toThrow();
    });

    it('should enforce name/ref exclusivity when changing ref', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      refBase.setNamedObject(named);

      // Set ref first while anonymous
      const qname1 = new QName('http://test.example.com', 'firstRef');
      refBase.setTargetQName(qname1);

      // Add name
      named.setName('namedElement');

      // Try to change ref - should fail
      const qname2 = new QName('http://test.example.com', 'secondRef');
      expect(() => refBase.setTargetQName(qname2)).toThrow(
        'It is invalid to set the ref= name for an item that has a name.',
      );
    });
  });

  describe('forgetTargetObject', () => {
    it('should clear target object when target QName changes', () => {
      refBase.setTargetObject('targetObject');
      expect(refBase.getTargetObject()).toBe('targetObject');

      const qname = new QName('http://test.example.com', 'element');
      refBase.setTargetQName(qname);

      expect(refBase.getTargetObject()).toBeNull();
    });

    it('should clear target object multiple times', () => {
      refBase.setTargetObject('object1');
      refBase.setTargetQName(new QName('http://test.example.com', 'elem1'));
      expect(refBase.getTargetObject()).toBeNull();

      refBase.setTargetObject('object2');
      refBase.setTargetQName(new QName('http://test.example.com', 'elem2'));
      expect(refBase.getTargetObject()).toBeNull();
    });
  });

  describe('complex scenarios', () => {
    it('should handle lifecycle: set ref -> forget -> set new ref', () => {
      const qname1 = new QName('http://test.example.com', 'ref1');
      refBase.setTargetQName(qname1);
      refBase.setTargetObject('target1');

      const qname2 = new QName('http://test.example.com', 'ref2');
      refBase.setTargetQName(qname2);

      expect(refBase.getTargetQName()).toBe(qname2);
      expect(refBase.getTargetObject()).toBeNull();
    });

    it('should handle name/ref mutual exclusivity', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      refBase.setNamedObject(named);

      // Start anonymous - ref should work
      const qname = new QName('http://test.example.com', 'refTarget');
      refBase.setTargetQName(qname);
      expect(refBase.getTargetQName()).toBe(qname);

      // Clear ref
      refBase.setTargetQName(new QName('http://other.com', 'other'));

      // Now add name to named object
      named.setName('namedElement');

      // Try to set ref again - should fail
      const newQname = new QName('http://test.example.com', 'newRef');
      expect(() => refBase.setTargetQName(newQname)).toThrow(
        'It is invalid to set the ref= name for an item that has a name.',
      );
    });

    it('should allow changing ref after name is cleared', () => {
      const named = new XmlSchemaNamedImpl(schema, false);
      refBase.setNamedObject(named);

      // Set initial ref while anonymous
      const qname1 = new QName('http://test.example.com', 'ref1');
      refBase.setTargetQName(qname1);

      // Add name
      named.setName('tempName');

      // Should fail to change ref with name
      const qname2 = new QName('http://test.example.com', 'ref2');
      expect(() => refBase.setTargetQName(qname2)).toThrow();

      // Clear name
      named.setName(null);

      // Should succeed to change ref now
      const qname3 = new QName('http://test.example.com', 'ref3');
      expect(() => refBase.setTargetQName(qname3)).not.toThrow();
      expect(refBase.getTargetQName()).toBe(qname3);
    });

    it('should handle multiple schema namespaces', () => {
      const schema1 = new XmlSchema('http://schema1.example.com');
      const schema2 = new XmlSchema('http://schema2.example.com');

      const qname1 = new QName('http://schema1.example.com', 'element1');
      const qname2 = new QName('http://schema2.example.com', 'element2');

      refBase.setParent(schema1);
      refBase.setTargetQName(qname1);
      expect(refBase.getTargetQName()?.getNamespaceURI()).toBe('http://schema1.example.com');

      refBase.setParent(schema2);
      refBase.setTargetQName(qname2);
      expect(refBase.getTargetQName()?.getNamespaceURI()).toBe('http://schema2.example.com');
    });

    it('should maintain ref integrity through target object changes', () => {
      const qname = new QName('http://test.example.com', 'element');
      refBase.setTargetQName(qname);

      refBase.setTargetObject('object1');
      expect(refBase.getTargetQName()).toBe(qname);

      refBase.setTargetObject('object2');
      expect(refBase.getTargetQName()).toBe(qname);
    });
  });
});
