import { QName } from './QName';
import { XmlSchema } from './XmlSchema';
import { XmlSchemaCollection } from './XmlSchemaCollection';
import { XmlSchemaDerivationMethod } from './XmlSchemaDerivationMethod';
import { XmlSchemaType } from './XmlSchemaType';

const NS = 'urn:test';
const q = (localPart: string) => new QName(NS, localPart);

const read = (content: string): XmlSchema =>
  new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}">${content}</xs:schema>`,
    () => {},
  );

describe('XmlSchemaType', () => {
  it('reads the final derivation of a type', () => {
    const schema = read('<xs:simpleType name="T" final="list"><xs:restriction base="xs:string"/></xs:simpleType>');

    const type = schema.getTypeByName('T')!;

    expect(type.getFinal().isList()).toBe(true);
    expect(type.getFinalDerivation().isList()).toBe(true);
  });

  it('reads a mixed complex type', () => {
    const schema = read('<xs:complexType name="T" mixed="true"><xs:sequence/></xs:complexType>');

    expect(schema.getTypeByName('T')!.isMixed()).toBe(true);
  });

  describe('naming', () => {
    it('moves a global type to its new name in the schema when it is renamed', () => {
      const schema = read('');
      const type = new XmlSchemaType(schema, true);
      type.setName('Old');

      type.setName('New');

      expect(schema.getSchemaTypes().get(q('Old'))).toBeUndefined();
      expect(schema.getSchemaTypes().get(q('New'))).toBe(type);
      expect(schema.getItems()).toContain(type);
    });

    it('rejects removing the name of a global type', () => {
      const type = new XmlSchemaType(read(''), true);

      expect(() => {
        type.setName(null);
      }).toThrow('A non-top-level type may not be anonyous.');
    });

    it('names a local type without adding it to the schema', () => {
      const schema = read('');
      const type = new XmlSchemaType(schema, false);

      type.setName('Local');

      expect(type.getQName()?.toString()).toBe(q('Local').toString());
      expect(schema.getSchemaTypes().get(q('Local'))).toBeUndefined();
      expect(schema.getItems()).not.toContain(type);
    });
  });

  it('keeps the values of the compiled schema that are set', () => {
    const type = new XmlSchemaType(read(''), false);
    const restriction = XmlSchemaDerivationMethod.schemaValueOf('restriction');
    const all = XmlSchemaDerivationMethod.schemaValueOf('#all');

    type.setDeriveBy(restriction);
    type.setFinalResolved(all);
    type.setFinalDerivation(restriction);

    expect(type.getDeriveBy()).toBe(restriction);
    expect(type.getFinalResolved()).toBe(all);
    expect(type.getFinal()).toBe(restriction);
  });
});
