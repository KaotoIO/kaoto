import { QName } from './QName';
import { DefaultURIResolver } from './resolver/DefaultURIResolver';
import { XmlSchema } from './XmlSchema';
import { XmlSchemaCollection } from './XmlSchemaCollection';

const NS = 'urn:test';
const q = (localPart: string) => new QName(NS, localPart);

const xsd = (content: string, schemaAttributes = `targetNamespace="${NS}" xmlns:t="${NS}"`) =>
  `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" ${schemaAttributes}>${content}</xs:schema>`;

const read = (content: string, schemaAttributes?: string): XmlSchema =>
  new XmlSchemaCollection().read(xsd(content, schemaAttributes), () => {});

/** Reads `main.xsd`, which includes `types.xsd` */
const readWithInclude = (mainContent: string, includedContent: string): XmlSchema => {
  const collection = new XmlSchemaCollection();
  collection.setSchemaResolver(new DefaultURIResolver({ 'types.xsd': xsd(includedContent, '') }));
  return collection.read(xsd(mainContent), () => {}, 'main.xsd');
};

describe('XmlSchema', () => {
  describe('lookups by name', () => {
    it('finds a global element, attribute and type by their local name', () => {
      const schema = read(
        '<xs:element name="order" type="xs:string"/><xs:attribute name="lang" type="xs:string"/>' +
          '<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>',
      );

      expect(schema.getElementByName('order')?.getName()).toBe('order');
      expect(schema.getAttributeByName('lang')?.getName()).toBe('lang');
      expect(schema.getTypeByName('Code')?.getName()).toBe('Code');
    });

    it('does not look into included schemas when looking up by local name', () => {
      const schema = readWithInclude(
        '<xs:include schemaLocation="types.xsd"/>',
        '<xs:element name="order" type="xs:string"/><xs:attribute name="lang" type="xs:string"/>',
      );

      expect(schema.getElementByName('order')).toBeNull();
      expect(schema.getAttributeByName('lang')).toBeNull();
    });
  });

  describe('lookups through included schemas', () => {
    type Lookup = (schema: XmlSchema, name: QName, deep: boolean) => { getName(): string | null } | null;
    const included =
      '<xs:attribute name="Component" type="xs:string"/><xs:attributeGroup name="Component"/>' +
      '<xs:group name="Component"><xs:sequence/></xs:group><xs:notation name="Component" public="image/png"/>';

    it.each<[string, Lookup]>([
      ['an attribute', (schema, name, deep) => schema.getAttributeByQName(name, deep)],
      ['an attribute group', (schema, name, deep) => schema.getAttributeGroupByQName(name, deep)],
      ['a group', (schema, name, deep) => schema.getGroupByQName(name, deep)],
      ['a notation', (schema, name, deep) => schema.getNotationByQName(name, deep)],
    ])('finds %s declared in an included schema only when the lookup is deep', (_, lookup) => {
      const schema = readWithInclude('<xs:include schemaLocation="types.xsd"/>', included);

      expect(lookup(schema, q('Component'), true)?.getName()).toBe('Component');
      expect(lookup(schema, q('Component'), false)).toBeNull();
    });
  });

  describe('schema defaults', () => {
    it('reads the version of the schema', () => {
      const schema = read('', `targetNamespace="${NS}" version="1.2"`);

      expect(schema.getVersion()).toBe('1.2');
    });

    it('reads the block and final defaults', () => {
      const schema = read('', `targetNamespace="${NS}" blockDefault="extension" finalDefault="#all"`);

      expect(schema.getBlockDefault().isExtension()).toBe(true);
      expect(schema.getFinalDefault().isAll()).toBe(true);
    });
  });

  describe('target namespace', () => {
    it('ignores an empty target namespace', () => {
      const schema = read('');

      schema.setTargetNamespace('');

      expect(schema.getTargetNamespace()).toBe(NS);
      expect(schema.getLogicalTargetNamespace()).toBe(NS);
    });

    it('keeps a syntactical target namespace set apart from the logical one', () => {
      const schema = read('', '');

      schema.setSyntacticalTargetNamespace('urn:syntactical');

      expect(schema.getSyntacticalTargetNamespace()).toBe('urn:syntactical');
      expect(schema.getLogicalTargetNamespace()).not.toBe('urn:syntactical');
    });
  });

  describe('serialization settings', () => {
    it('keeps the input encoding and the namespace prefix of the target namespace', () => {
      const schema = read('');

      schema.setInputEncoding('UTF-16');
      schema.setSchemaNamespacePrefix('t');

      expect(schema.getInputEncoding()).toBe('UTF-16');
      expect(schema.getSchemaNamespacePrefix()).toBe('t');
    });
  });

  describe('constructor', () => {
    it('rejects a second schema with the same namespace and system id in a collection', () => {
      const collection = new XmlSchemaCollection();
      new XmlSchema(NS, 'main.xsd', collection);

      expect(() => new XmlSchema(NS, 'main.xsd', collection)).toThrow('conflicts in collection');
    });
  });
});
