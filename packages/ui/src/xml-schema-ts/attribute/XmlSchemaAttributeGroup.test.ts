import { QName } from '../QName';
import { XmlSchema } from '../XmlSchema';
import { XmlSchemaAnyAttribute } from '../XmlSchemaAnyAttribute';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaAttribute } from './XmlSchemaAttribute';
import { XmlSchemaAttributeGroup } from './XmlSchemaAttributeGroup';
import { XmlSchemaAttributeGroupRef } from './XmlSchemaAttributeGroupRef';

const NS = 'urn:test';
const q = (localPart: string) => new QName(NS, localPart);

const read = (content: string): XmlSchema =>
  new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}" xmlns:t="${NS}">${content}</xs:schema>`,
    () => {},
  );

describe('XmlSchemaAttributeGroup', () => {
  it('reads a named global attribute group with its members', () => {
    const schema = read(
      '<xs:attributeGroup name="Base"><xs:attribute name="id" type="xs:ID"/></xs:attributeGroup>' +
        '<xs:attributeGroup name="Common">' +
        '<xs:attribute name="lang" type="xs:string"/><xs:attributeGroup ref="t:Base"/><xs:anyAttribute/>' +
        '</xs:attributeGroup>',
    );

    const group = schema.getAttributeGroups().get(q('Common'))!;

    expect(group.getName()).toBe('Common');
    expect(group.getQName()?.toString()).toBe(q('Common').toString());
    expect(group.getParent()).toBe(schema);
    expect(group.isTopLevel()).toBe(true);
    expect(group.isAnonymous()).toBe(false);
    expect(group.getAttributes()[0]).toBeInstanceOf(XmlSchemaAttribute);
    expect(group.getAttributes()[1]).toBeInstanceOf(XmlSchemaAttributeGroupRef);
    expect(group.getAnyAttribute()).toBeInstanceOf(XmlSchemaAnyAttribute);
  });

  it('reads an attribute group without a name as anonymous and keeps it out of the named groups', () => {
    const schema = read('<xs:attributeGroup/>');

    const group = schema.getItems()[0] as XmlSchemaAttributeGroup;

    expect(group.isAnonymous()).toBe(true);
    expect(schema.getAttributeGroups().size).toBe(0);
  });

  it('moves an attribute group to its new name in the schema when it is renamed', () => {
    const schema = read('');
    const group = new XmlSchemaAttributeGroup(schema);
    group.setName('Old');

    group.setName('New');

    expect(schema.getAttributeGroups().get(q('Old'))).toBeUndefined();
    expect(schema.getAttributeGroups().get(q('New'))).toBe(group);
  });

  describe('clearRefCache', () => {
    it('clears target cache on the attribute group reference', () => {
      const schema = read(
        '<xs:attributeGroup name="Base"><xs:attribute name="id" type="xs:ID"/></xs:attributeGroup>' +
          '<xs:attributeGroup name="Common"><xs:attributeGroup ref="t:Base"/></xs:attributeGroup>',
      );
      const commonGroup = schema.getAttributeGroups().get(q('Common'))!;
      const groupRef = commonGroup.getAttributes()[0] as XmlSchemaAttributeGroupRef;
      expect(groupRef.getRef().getTarget()).toBeTruthy();

      expect(() => {
        groupRef.clearRefCache();
      }).not.toThrow();
    });
  });
});
