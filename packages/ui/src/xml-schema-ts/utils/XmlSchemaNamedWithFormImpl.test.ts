import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaForm } from '../XmlSchemaForm';
import { XmlSchemaNamedWithFormImpl } from './XmlSchemaNamedWithFormImpl';
import { XmlSchemaRefBase } from './XmlSchemaRefBase';

// Mock XmlSchemaRefBase for testing
class MockRefBase extends XmlSchemaRefBase {
  protected forgetTargetObject(): void {
    // Mock implementation
  }
}

describe('XmlSchemaNamedWithFormImpl', () => {
  let schema: XmlSchema;

  beforeEach(() => {
    schema = new XmlSchema('http://test.example.com');
  });

  describe('constructor', () => {
    it('should create element with default form NONE', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      expect(element.isFormSpecified()).toBe(false);
    });

    it('should create attribute with parent schema', () => {
      const attribute = new XmlSchemaNamedWithFormImpl(schema, false, false);

      expect(attribute.getParent()).toBe(schema);
    });

    it('should distinguish between element and attribute', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      const attribute = new XmlSchemaNamedWithFormImpl(schema, false, false);

      // They should behave differently based on element flag
      expect(element).toBeDefined();
      expect(attribute).toBeDefined();
    });
  });

  describe('getForm', () => {
    it('should return QUALIFIED for top-level element when form not specified', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, true, true);

      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });

    it('should return QUALIFIED for top-level attribute when form not specified', () => {
      const attribute = new XmlSchemaNamedWithFormImpl(schema, true, false);

      expect(attribute.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });

    it('should return schema elementFormDefault for nested element when form not specified', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      expect(element.getForm()).toBe(schema.getElementFormDefault());
    });

    it('should return schema attributeFormDefault for nested attribute when form not specified', () => {
      const attribute = new XmlSchemaNamedWithFormImpl(schema, false, false);

      expect(attribute.getForm()).toBe(schema.getAttributeFormDefault());
    });

    it('should return explicitly set form', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.QUALIFIED);

      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });

    it('should override default with explicitly set form', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.UNQUALIFIED);

      expect(element.getForm()).toBe(XmlSchemaForm.UNQUALIFIED);
    });
  });

  describe('setForm', () => {
    it('should set form to QUALIFIED', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.QUALIFIED);

      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);
      expect(element.isFormSpecified()).toBe(true);
    });

    it('should set form to UNQUALIFIED', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.UNQUALIFIED);

      expect(element.getForm()).toBe(XmlSchemaForm.UNQUALIFIED);
      expect(element.isFormSpecified()).toBe(true);
    });

    it('should set form to NONE to use schema default', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.QUALIFIED);
      element.setForm(XmlSchemaForm.NONE);

      expect(element.getForm()).toBe(schema.getElementFormDefault());
      expect(element.isFormSpecified()).toBe(false);
    });

    it('should throw error when setting null form', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      expect(() => element.setForm(null as unknown as XmlSchemaForm)).toThrow(
        'form may not be null. Pass XmlSchemaForm.NONE to use schema default.',
      );
    });

    it('should update wire name when form changes', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setName('testElement');
      element.setForm(XmlSchemaForm.QUALIFIED);

      const wireName = element.getWireName();
      expect(wireName?.getNamespaceURI()).toBe('http://test.example.com');
    });
  });

  describe('isFormSpecified', () => {
    it('should return false for newly created object', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      expect(element.isFormSpecified()).toBe(false);
    });

    it('should return true after setting form', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.QUALIFIED);

      expect(element.isFormSpecified()).toBe(true);
    });

    it('should return false after resetting form to NONE', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.QUALIFIED);
      element.setForm(XmlSchemaForm.NONE);

      expect(element.isFormSpecified()).toBe(false);
    });
  });

  describe('setName and getWireName', () => {
    it('should create qualified wire name when form is QUALIFIED', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, true, true);
      element.setName('testElement');

      const wireName = element.getWireName();
      expect(wireName?.getNamespaceURI()).toBe('http://test.example.com');
      expect(wireName?.getLocalPart()).toBe('testElement');
    });

    it('should create unqualified wire name when form is UNQUALIFIED', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      element.setForm(XmlSchemaForm.UNQUALIFIED);
      element.setName('testElement');

      const wireName = element.getWireName();
      expect(wireName?.getNamespaceURI()).toBe('');
      expect(wireName?.getLocalPart()).toBe('testElement');
    });

    it('should update wire name when name changes', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, true, true);
      element.setName('firstName');
      const wireName1 = element.getWireName();

      element.setName('secondName');
      const wireName2 = element.getWireName();

      expect(wireName1?.getLocalPart()).toBe('firstName');
      expect(wireName2?.getLocalPart()).toBe('secondName');
    });

    it('should use ref target QName when ref is set', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      const refBase = new MockRefBase();
      const targetQName = new QName('http://target.example.com', 'refTarget');
      refBase.setTargetQName(targetQName);

      element.setRefObject(refBase);

      expect(element.getWireName()).toBe(targetQName);
    });

    it('should use wire name when no ref is set', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, true, true);
      element.setName('testElement');

      const wireName = element.getWireName();
      expect(wireName?.getLocalPart()).toBe('testElement');
    });
  });

  describe('getWireName with ref', () => {
    it('should return ref target QName when ref exists', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      const refBase = new MockRefBase();
      const targetQName = new QName('http://ref.example.com', 'refElement');

      element.setRefObject(refBase);
      refBase.setTargetQName(targetQName);

      expect(element.getWireName()).toBe(targetQName);
    });

    it('should return wire name when ref target is null', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, true, true);
      const refBase = new MockRefBase();

      element.setRefObject(refBase);
      element.setName('testElement');

      const wireName = element.getWireName();
      expect(wireName?.getLocalPart()).toBe('testElement');
    });
  });

  describe('form inheritance from schema defaults', () => {
    it('should use elementFormDefault for nested elements', () => {
      schema.setElementFormDefault(XmlSchemaForm.QUALIFIED);
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });

    it('should use attributeFormDefault for nested attributes', () => {
      schema.setAttributeFormDefault(XmlSchemaForm.QUALIFIED);
      const attribute = new XmlSchemaNamedWithFormImpl(schema, false, false);

      expect(attribute.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });

    it('should not use elementFormDefault for top-level elements', () => {
      schema.setElementFormDefault(XmlSchemaForm.UNQUALIFIED);
      const element = new XmlSchemaNamedWithFormImpl(schema, true, true);

      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });

    it('should not use attributeFormDefault for top-level attributes', () => {
      schema.setAttributeFormDefault(XmlSchemaForm.UNQUALIFIED);
      const attribute = new XmlSchemaNamedWithFormImpl(schema, true, false);

      expect(attribute.getForm()).toBe(XmlSchemaForm.QUALIFIED);
    });
  });

  describe('complex scenarios', () => {
    it('should handle element with changing form and name', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      element.setName('element1');
      element.setForm(XmlSchemaForm.QUALIFIED);
      const wireName1 = element.getWireName();

      element.setForm(XmlSchemaForm.UNQUALIFIED);
      const wireName2 = element.getWireName();

      element.setName('element2');
      const wireName3 = element.getWireName();

      expect(wireName1?.getNamespaceURI()).toBe('http://test.example.com');
      expect(wireName2?.getNamespaceURI()).toBe('');
      expect(wireName3?.getLocalPart()).toBe('element2');
    });

    it('should handle qualified element vs unqualified attribute', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      const attribute = new XmlSchemaNamedWithFormImpl(schema, false, false);

      element.setForm(XmlSchemaForm.QUALIFIED);
      attribute.setForm(XmlSchemaForm.UNQUALIFIED);

      element.setName('myElement');
      attribute.setName('myAttribute');

      const elementWire = element.getWireName();
      const attributeWire = attribute.getWireName();

      expect(elementWire?.getNamespaceURI()).toBe('http://test.example.com');
      expect(attributeWire?.getNamespaceURI()).toBe('');
    });

    it('should handle lifecycle: create -> set name -> set form -> change name', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);

      expect(element.isAnonymous()).toBe(true);

      element.setName('firstName');
      expect(element.getName()).toBe('firstName');

      element.setForm(XmlSchemaForm.QUALIFIED);
      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);

      element.setName('secondName');
      expect(element.getName()).toBe('secondName');
      expect(element.getWireName()?.getLocalPart()).toBe('secondName');
    });

    it('should differentiate elements and attributes with same name', () => {
      const element = new XmlSchemaNamedWithFormImpl(schema, false, true);
      const attribute = new XmlSchemaNamedWithFormImpl(schema, false, false);

      schema.setElementFormDefault(XmlSchemaForm.QUALIFIED);
      schema.setAttributeFormDefault(XmlSchemaForm.UNQUALIFIED);

      element.setName('sameName');
      attribute.setName('sameName');

      expect(element.getForm()).toBe(XmlSchemaForm.QUALIFIED);
      expect(attribute.getForm()).toBe(XmlSchemaForm.UNQUALIFIED);
      expect(element.getWireName()?.getNamespaceURI()).toBe('http://test.example.com');
      expect(attribute.getWireName()?.getNamespaceURI()).toBe('');
    });
  });
});
