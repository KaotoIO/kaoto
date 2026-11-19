import { XmlSchemaComplexType } from '../complex/XmlSchemaComplexType';
import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaForm } from '../XmlSchemaForm';
import { XmlSchemaAttribute } from './XmlSchemaAttribute';

const NS = 'urn:test';

const read = (content: string): XmlSchema =>
  new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}" xmlns:t="${NS}">${content}</xs:schema>`,
    () => {},
  );

/** The first attribute of the complex type `C` */
const localAttribute = (schema: XmlSchema) =>
  (schema.getTypeByName('C') as XmlSchemaComplexType).getAttributes()[0] as XmlSchemaAttribute;

describe('XmlSchemaAttribute', () => {
  describe('references', () => {
    it('is a reference to the global attribute it refers to', () => {
      const schema = read(
        '<xs:attribute name="lang" type="xs:string"/><xs:complexType name="C"><xs:attribute ref="t:lang"/></xs:complexType>',
      );

      const attribute = localAttribute(schema);

      expect(attribute.isRef()).toBe(true);
      expect(attribute.getTargetQName()?.toString()).toBe(new QName(NS, 'lang').toString());
      expect(attribute.getRefBase()).toBe(attribute.getRef());
    });

    it('is no reference when it declares the attribute itself', () => {
      const schema = read('<xs:complexType name="C"><xs:attribute name="lang" type="xs:string"/></xs:complexType>');

      const attribute = localAttribute(schema);

      expect(attribute.isRef()).toBe(false);
      expect(attribute.getTargetQName()).toBeNull();
    });
  });

  describe('naming', () => {
    it.each([
      ['a declared attribute', '<xs:attribute name="lang" type="xs:string"/>', false],
      ['a reference', '<xs:attribute ref="t:lang"/>', true],
    ])('tells whether it is anonymous for %s', (_, declaration, anonymous) => {
      const schema = read(
        `<xs:attribute name="lang" type="xs:string"/><xs:complexType name="C">${declaration}</xs:complexType>`,
      );

      expect(localAttribute(schema).isAnonymous()).toBe(anonymous);
    });

    it('moves a global attribute to its new name in the schema when it is renamed', () => {
      const schema = read('');
      const attribute = new XmlSchemaAttribute(schema, true);
      attribute.setName('old');

      attribute.setName('new');

      expect(schema.getAttributes().get(new QName(NS, 'old'))).toBeUndefined();
      expect(schema.getAttributes().get(new QName(NS, 'new'))).toBe(attribute);
    });

    it('rejects making a global attribute anonymous', () => {
      const attribute = new XmlSchemaAttribute(read(''), true);

      expect(() => {
        attribute.setName(null);
      }).toThrow('Top-level attributes may not be anonymous');
    });
  });

  describe('form', () => {
    it('reads the form and the default value of a local attribute', () => {
      const schema = read(
        '<xs:complexType name="C"><xs:attribute name="a" type="xs:string" form="qualified" default="x"/></xs:complexType>',
      );

      const attribute = localAttribute(schema);

      expect(attribute.getForm()).toBe(XmlSchemaForm.QUALIFIED);
      expect(attribute.getDefaultValue()).toBe('x');
    });

    it.each([
      ['with a form', 'form="qualified"', true],
      ['without a form', '', false],
    ])('tells whether the form is specified for a local attribute %s', (_, form, specified) => {
      const schema = read(
        `<xs:complexType name="C"><xs:attribute name="a" type="xs:string" ${form}/></xs:complexType>`,
      );

      expect(localAttribute(schema).isFormSpecified()).toBe(specified);
    });
  });

  describe('global attributes', () => {
    it.each([
      ['a use', 'use="required"', "Top-level attributes may not have a 'use'"],
      ['a form', 'form="qualified"', "Top-level attributes may not have a 'form'"],
    ])('rejects %s on a global attribute', (_, attribute, error) => {
      expect(() => read(`<xs:attribute name="a" type="xs:string" ${attribute}/>`)).toThrow(error);
    });
  });
});
