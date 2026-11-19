import { XmlSchemaAttribute } from '../attribute/XmlSchemaAttribute';
import { XmlSchemaSequence } from '../particle/XmlSchemaSequence';
import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaContentType } from '../XmlSchemaContentType';
import { XmlSchemaDerivationMethod } from '../XmlSchemaDerivationMethod';
import { XmlSchemaComplexType } from './XmlSchemaComplexType';

const NS = 'urn:test';

const read = (content: string): XmlSchema =>
  new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}" xmlns:t="${NS}">` +
      '<xs:complexType name="Base"><xs:sequence/></xs:complexType>' +
      `${content}</xs:schema>`,
    () => {},
  );

const complexType = (schema: XmlSchema, name: string) => schema.getTypeByName(name) as XmlSchemaComplexType;

describe('XmlSchemaComplexType', () => {
  describe('getBaseSchemaTypeName', () => {
    it.each([
      ['extension', '<xs:complexContent><xs:extension base="t:Base"/></xs:complexContent>'],
      ['restriction', '<xs:complexContent><xs:restriction base="t:Base"/></xs:complexContent>'],
    ])('returns the base type of a complex content %s', (_, contentModel) => {
      const schema = read(`<xs:complexType name="Derived">${contentModel}</xs:complexType>`);

      const baseTypeName = complexType(schema, 'Derived').getBaseSchemaTypeName();

      expect(baseTypeName?.toString()).toBe(new QName(NS, 'Base').toString());
    });

    it.each([
      ['without a content model', '<xs:sequence/>'],
      [
        'with a complex content that has neither an extension nor a restriction',
        '<xs:complexContent><xs:annotation/></xs:complexContent>',
      ],
      ['with a simple content', '<xs:simpleContent><xs:extension base="xs:string"/></xs:simpleContent>'],
    ])('returns null for a type %s', (_, content) => {
      const schema = read(`<xs:complexType name="Derived">${content}</xs:complexType>`);

      expect(complexType(schema, 'Derived').getBaseSchemaTypeName()).toBeNull();
    });
  });

  it('reads the any attribute of a type', () => {
    const schema = read('<xs:complexType name="Open"><xs:anyAttribute namespace="##other"/></xs:complexType>');

    const anyAttribute = complexType(schema, 'Open').getAnyAttribute();

    expect(anyAttribute).toBeInstanceOf(XmlSchemaAnyAttribute);
    expect(anyAttribute?.getNamespace()).toBe('##other');
  });

  describe('properties of the compiled schema', () => {
    it('leaves them unset when the schema is read', () => {
      const type = complexType(read(''), 'Base');

      expect(type.getAttributeWildcard()).toBeNull();
      expect(type.getBlockResolved()).toBeNull();
      expect(type.getContentType()).toBeNull();
      expect(type.getContentTypeParticle()).toBeNull();
    });

    it('keeps the values that are set', () => {
      const schema = read('');
      const type = new XmlSchemaComplexType(schema, false);
      const wildcard = new XmlSchemaAnyAttribute();
      const blockResolved = XmlSchemaDerivationMethod.schemaValueOf('#all');
      const particleType = new XmlSchemaSequence();
      const attributes = [new XmlSchemaAttribute(schema, false)];

      type.setAttributeWildcard(wildcard);
      type.setBlockResolved(blockResolved);
      type.setContentType(XmlSchemaContentType.MIXED);
      type.setParticleType(particleType);
      type.setAttributes(attributes);

      expect(type.getAttributeWildcard()).toBe(wildcard);
      expect(type.getBlockResolved()).toBe(blockResolved);
      expect(type.getContentType()).toBe(XmlSchemaContentType.MIXED);
      expect(type.getParticleType()).toBe(particleType);
      expect(type.getContentTypeParticle()).toBe(particleType);
      expect(type.getAttributes()).toBe(attributes);
    });
  });
});
