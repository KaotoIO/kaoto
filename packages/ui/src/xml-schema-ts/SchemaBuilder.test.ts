import { XmlSchemaAppInfo } from './annotation/XmlSchemaAppInfo';
import { XmlSchemaDocumentation } from './annotation/XmlSchemaDocumentation';
import { XmlSchemaAttribute } from './attribute/XmlSchemaAttribute';
import { XmlSchemaAttributeGroupRef } from './attribute/XmlSchemaAttributeGroupRef';
import { XmlSchemaComplexContent } from './complex/XmlSchemaComplexContent';
import { XmlSchemaComplexContentExtension } from './complex/XmlSchemaComplexContentExtension';
import { XmlSchemaComplexContentRestriction } from './complex/XmlSchemaComplexContentRestriction';
import { XmlSchemaComplexType } from './complex/XmlSchemaComplexType';
import { ExtensionRegistry } from './extensions/ExtensionRegistry';
import { XmlSchemaImport } from './external/XmlSchemaImport';
import { XmlSchemaInclude } from './external/XmlSchemaInclude';
import { XmlSchemaRedefine } from './external/XmlSchemaRedefine';
import { XmlSchemaAll } from './particle/XmlSchemaAll';
import { XmlSchemaAny } from './particle/XmlSchemaAny';
import { XmlSchemaChoice } from './particle/XmlSchemaChoice';
import { XmlSchemaGroupRef } from './particle/XmlSchemaGroupRef';
import { XmlSchemaSequence } from './particle/XmlSchemaSequence';
import { QName } from './QName';
import { DefaultURIResolver } from './resolver/DefaultURIResolver';
import { SchemaBuilder } from './SchemaBuilder';
import { XmlSchemaSimpleContent } from './simple/XmlSchemaSimpleContent';
import { XmlSchemaSimpleContentExtension } from './simple/XmlSchemaSimpleContentExtension';
import { XmlSchemaSimpleContentRestriction } from './simple/XmlSchemaSimpleContentRestriction';
import { XmlSchemaSimpleType } from './simple/XmlSchemaSimpleType';
import { XmlSchemaSimpleTypeList } from './simple/XmlSchemaSimpleTypeList';
import { XmlSchemaSimpleTypeRestriction } from './simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchemaSimpleTypeUnion } from './simple/XmlSchemaSimpleTypeUnion';
import { XmlSchema } from './XmlSchema';
import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';
import { XmlSchemaAnyAttribute } from './XmlSchemaAnyAttribute';
import { XmlSchemaCollection } from './XmlSchemaCollection';
import { XmlSchemaContentProcessing } from './XmlSchemaContentProcessing';
import { XmlSchemaForm } from './XmlSchemaForm';

const NS = 'urn:test';
const q = (localPart: string) => new QName(NS, localPart);

/** An XML schema in the namespace `urn:test` (prefix `t`) with the given top-level content */
const xsd = (content: string, schemaAttributes = `targetNamespace="${NS}" xmlns:t="${NS}"`) =>
  `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" ${schemaAttributes}>${content}</xs:schema>`;

const read = (content: string, schemaAttributes?: string): XmlSchema =>
  new XmlSchemaCollection().read(xsd(content, schemaAttributes), () => {});

/** Reads `main.xsd` with the other files available to its import, include and redefine directives */
const readFiles = (files: Record<string, string>): XmlSchema => {
  const collection = new XmlSchemaCollection();
  collection.setSchemaResolver(new DefaultURIResolver(files));
  return collection.read(files['main.xsd'], () => {}, 'main.xsd');
};

const documentationOf = (annotated: XmlSchemaAnnotated | null | undefined): string | undefined => {
  const item = annotated?.getAnnotation()?.getItems()[0];
  return item instanceof XmlSchemaDocumentation ? (item.getMarkup()?.item(0)?.textContent ?? undefined) : undefined;
};

const NOTE = '<xs:annotation><xs:documentation>note</xs:documentation></xs:annotation>';

const complexType = (schema: XmlSchema, name: string) => schema.getTypeByName(name) as XmlSchemaComplexType;
const simpleType = (schema: XmlSchema, name: string) => schema.getTypeByName(name) as XmlSchemaSimpleType;
const complexContentOf = (schema: XmlSchema, name: string) =>
  (complexType(schema, name).getContentModel() as XmlSchemaComplexContent).getContent();
const simpleContentOf = (schema: XmlSchema, name: string) =>
  (complexType(schema, name).getContentModel() as XmlSchemaSimpleContent).getContent();

describe('SchemaBuilder', () => {
  describe('annotations', () => {
    it.each<[string, string, (schema: XmlSchema) => XmlSchemaAnnotated | null | undefined]>([
      [
        'a simple type',
        `<xs:simpleType name="S">${NOTE}<xs:restriction base="xs:string"/></xs:simpleType>`,
        (schema) => simpleType(schema, 'S'),
      ],
      [
        'a simple type restriction',
        `<xs:simpleType name="S"><xs:restriction base="xs:string">${NOTE}</xs:restriction></xs:simpleType>`,
        (schema) => simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeRestriction,
      ],
      [
        'a facet of a simple type',
        `<xs:simpleType name="S"><xs:restriction base="xs:string"><xs:maxLength value="5">${NOTE}</xs:maxLength></xs:restriction></xs:simpleType>`,
        (schema) => (simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeRestriction).getFacets()[0],
      ],
      [
        'a list',
        `<xs:simpleType name="S"><xs:list itemType="xs:int">${NOTE}</xs:list></xs:simpleType>`,
        (schema) => simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeList,
      ],
      [
        'a union',
        `<xs:simpleType name="S"><xs:union memberTypes="xs:int xs:string">${NOTE}</xs:union></xs:simpleType>`,
        (schema) => simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeUnion,
      ],
      [
        'an all',
        `<xs:complexType name="C"><xs:all>${NOTE}<xs:element name="a" type="xs:string"/></xs:all></xs:complexType>`,
        (schema) => complexType(schema, 'C').getParticle(),
      ],
      [
        'a choice',
        `<xs:complexType name="C"><xs:choice>${NOTE}<xs:element name="a" type="xs:string"/></xs:choice></xs:complexType>`,
        (schema) => complexType(schema, 'C').getParticle(),
      ],
      [
        'an any',
        `<xs:complexType name="C"><xs:sequence><xs:any>${NOTE}</xs:any></xs:sequence></xs:complexType>`,
        (schema) => (complexType(schema, 'C').getParticle() as XmlSchemaSequence).getItems()[0] as XmlSchemaAny,
      ],
      [
        'an any attribute',
        `<xs:complexType name="C"><xs:anyAttribute>${NOTE}</xs:anyAttribute></xs:complexType>`,
        (schema) => complexType(schema, 'C').getAnyAttribute(),
      ],
      ['a group', `<xs:group name="G">${NOTE}<xs:sequence/></xs:group>`, (schema) => schema.getGroups().get(q('G'))],
      [
        'a group reference',
        `<xs:group name="G"><xs:sequence/></xs:group><xs:complexType name="C"><xs:sequence><xs:group ref="t:G">${NOTE}</xs:group></xs:sequence></xs:complexType>`,
        (schema) => (complexType(schema, 'C').getParticle() as XmlSchemaSequence).getItems()[0] as XmlSchemaGroupRef,
      ],
      [
        'an attribute group',
        `<xs:attributeGroup name="AG">${NOTE}</xs:attributeGroup>`,
        (schema) => schema.getAttributeGroups().get(q('AG')),
      ],
      [
        'an attribute group reference',
        `<xs:attributeGroup name="AG"/><xs:complexType name="C"><xs:attributeGroup ref="t:AG">${NOTE}</xs:attributeGroup></xs:complexType>`,
        (schema) => complexType(schema, 'C').getAttributes()[0] as XmlSchemaAttributeGroupRef,
      ],
      [
        'a complex content',
        `<xs:complexType name="C"><xs:complexContent>${NOTE}<xs:extension base="xs:anyType"/></xs:complexContent></xs:complexType>`,
        (schema) => complexType(schema, 'C').getContentModel() as XmlSchemaComplexContent,
      ],
      [
        'a complex content extension',
        `<xs:complexType name="C"><xs:complexContent><xs:extension base="xs:anyType">${NOTE}</xs:extension></xs:complexContent></xs:complexType>`,
        (schema) => complexContentOf(schema, 'C') as XmlSchemaComplexContentExtension,
      ],
      [
        'a complex content restriction',
        `<xs:complexType name="C"><xs:complexContent><xs:restriction base="xs:anyType">${NOTE}</xs:restriction></xs:complexContent></xs:complexType>`,
        (schema) => complexContentOf(schema, 'C') as XmlSchemaComplexContentRestriction,
      ],
      [
        'a simple content',
        `<xs:complexType name="C"><xs:simpleContent>${NOTE}<xs:extension base="xs:string"/></xs:simpleContent></xs:complexType>`,
        (schema) => complexType(schema, 'C').getContentModel() as XmlSchemaSimpleContent,
      ],
      [
        'a simple content extension',
        `<xs:complexType name="C"><xs:simpleContent><xs:extension base="xs:string">${NOTE}</xs:extension></xs:simpleContent></xs:complexType>`,
        (schema) => simpleContentOf(schema, 'C') as XmlSchemaSimpleContentExtension,
      ],
      [
        'a simple content restriction',
        `<xs:complexType name="C"><xs:simpleContent><xs:restriction base="xs:string">${NOTE}</xs:restriction></xs:simpleContent></xs:complexType>`,
        (schema) => simpleContentOf(schema, 'C') as XmlSchemaSimpleContentRestriction,
      ],
      [
        'a facet of a simple content restriction',
        `<xs:complexType name="C"><xs:simpleContent><xs:restriction base="xs:string"><xs:maxLength value="5">${NOTE}</xs:maxLength></xs:restriction></xs:simpleContent></xs:complexType>`,
        (schema) => (simpleContentOf(schema, 'C') as XmlSchemaSimpleContentRestriction).getFacets()[0],
      ],
      [
        'a notation',
        `<xs:notation name="png" public="image/png">${NOTE}</xs:notation>`,
        (schema) => schema.getNotations().get(q('png')),
      ],
    ])('reads the annotation of %s', (_, content, annotated) => {
      const schema = read(content);

      expect(documentationOf(annotated(schema))).toBe('note');
    });

    it('skips an appinfo and a documentation without content or attributes', () => {
      const schema = read('<xs:annotation><xs:appinfo/><xs:documentation/></xs:annotation>');

      expect(schema.getAnnotation()?.getItems()).toEqual([]);
    });

    it('keeps an empty appinfo and documentation that have a source', () => {
      const schema = read('<xs:annotation><xs:appinfo source="a"/><xs:documentation source="d"/></xs:annotation>');

      const [appInfo, documentation] = schema.getAnnotation()!.getItems() as [XmlSchemaAppInfo, XmlSchemaDocumentation];
      expect(appInfo.source).toBe('a');
      expect(documentation.getSource()).toBe('d');
    });
  });

  describe('schema', () => {
    it('reads the id and the version of the schema', () => {
      const schema = read('', `targetNamespace="${NS}" id="main" version="1.2"`);

      expect(schema.getId()).toBe('main');
      expect(schema.getVersion()).toBe('1.2');
    });

    it('rejects a reference with a prefix that is not bound', () => {
      expect(() => read('<xs:element name="a" type="other:T"/>')).toThrow('The prefix other is not bound.');
    });
  });

  describe('elements', () => {
    it('reads the final derivation and the id of an element', () => {
      const schema = read('<xs:element name="a" type="xs:string" final="#all" id="element-a"/>');

      const element = schema.getElements().get(q('a'))!;
      expect(element.getFinal().isAll()).toBe(true);
      expect(element.getId()).toBe('element-a');
    });
  });

  describe('attributes', () => {
    it('reads the default value, the form and the id of an attribute', () => {
      const schema = read(
        '<xs:complexType name="C"><xs:attribute name="a" type="xs:string" default="x" form="qualified" id="attr-a"/></xs:complexType>',
      );

      const attribute = complexType(schema, 'C').getAttributes()[0] as XmlSchemaAttribute;
      expect(attribute.getDefaultValue()).toBe('x');
      expect(attribute.getForm()).toBe(XmlSchemaForm.QUALIFIED);
      expect(attribute.getId()).toBe('attr-a');
    });

    it('reads a reference to a global attribute', () => {
      const schema = read(
        '<xs:attribute name="lang" type="xs:string"/><xs:complexType name="C"><xs:attribute ref="t:lang"/></xs:complexType>',
      );

      const attribute = complexType(schema, 'C').getAttributes()[0] as XmlSchemaAttribute;
      expect(attribute.getRef().getTargetQName()?.toString()).toBe(q('lang').toString());
    });

    it('reads the id of an attribute group and of a reference to it', () => {
      const schema = read(
        '<xs:attributeGroup name="AG" id="group"/><xs:complexType name="C"><xs:attributeGroup ref="t:AG" id="ref"/></xs:complexType>',
      );

      expect(schema.getAttributeGroups().get(q('AG'))!.getId()).toBe('group');
      expect((complexType(schema, 'C').getAttributes()[0] as XmlSchemaAttributeGroupRef).getId()).toBe('ref');
    });
  });

  describe('any attribute', () => {
    it('reads the namespace, the content processing and the id', () => {
      const schema = read(
        '<xs:complexType name="C"><xs:anyAttribute namespace="##other" processContents="lax" id="any"/></xs:complexType>',
      );

      const anyAttribute = complexType(schema, 'C').getAnyAttribute()!;
      expect(anyAttribute.getNamespace()).toBe('##other');
      expect(anyAttribute.getProcessContent()).toBe(XmlSchemaContentProcessing.LAX);
      expect(anyAttribute.getId()).toBe('any');
    });

    it.each<[string, string, (schema: XmlSchema) => XmlSchemaAnyAttribute | null | undefined]>([
      [
        'an attribute group',
        '<xs:attributeGroup name="AG"><xs:anyAttribute/></xs:attributeGroup>',
        (schema) => schema.getAttributeGroups().get(q('AG'))!.getAnyAttribute(),
      ],
      [
        'a complex content extension',
        '<xs:complexType name="C"><xs:complexContent><xs:extension base="xs:anyType"><xs:anyAttribute/></xs:extension></xs:complexContent></xs:complexType>',
        (schema) => (complexContentOf(schema, 'C') as XmlSchemaComplexContentExtension).getAnyAttribute(),
      ],
      [
        'a complex content restriction',
        '<xs:complexType name="C"><xs:complexContent><xs:restriction base="xs:anyType"><xs:anyAttribute/></xs:restriction></xs:complexContent></xs:complexType>',
        (schema) => (complexContentOf(schema, 'C') as XmlSchemaComplexContentRestriction).getAnyAttribute(),
      ],
      [
        'a simple content extension',
        '<xs:complexType name="C"><xs:simpleContent><xs:extension base="xs:string"><xs:anyAttribute/></xs:extension></xs:simpleContent></xs:complexType>',
        (schema) => (simpleContentOf(schema, 'C') as XmlSchemaSimpleContentExtension).getAnyAttribute(),
      ],
      [
        'a simple content restriction',
        '<xs:complexType name="C"><xs:simpleContent><xs:restriction base="xs:string"><xs:anyAttribute/></xs:restriction></xs:simpleContent></xs:complexType>',
        (schema) => (simpleContentOf(schema, 'C') as XmlSchemaSimpleContentRestriction).getAnyAttribute(),
      ],
    ])('reads an any attribute in %s', (_, content, anyAttributeOf) => {
      const schema = read(content);

      expect(anyAttributeOf(schema)).toBeInstanceOf(XmlSchemaAnyAttribute);
    });
  });

  describe('particles', () => {
    it('reads the id of a choice and an any inside it', () => {
      const schema = read(
        '<xs:complexType name="C"><xs:choice id="c"><xs:any namespace="##any"/></xs:choice></xs:complexType>',
      );

      const choice = complexType(schema, 'C').getParticle() as XmlSchemaChoice;
      expect(choice.getId()).toBe('c');
      expect(choice.getItems()[0]).toBeInstanceOf(XmlSchemaAny);
    });

    it.each([
      ['all', XmlSchemaAll],
      ['choice', XmlSchemaChoice],
    ])('reads a named group made of an %s', (compositor, particleClass) => {
      const schema = read(
        `<xs:group name="G"><xs:${compositor}><xs:element name="a" type="xs:string"/></xs:${compositor}></xs:group>`,
      );

      expect(schema.getGroups().get(q('G'))!.getParticle()).toBeInstanceOf(particleClass);
    });
  });

  describe('complex content', () => {
    it.each([
      ['true', true],
      ['false', false],
    ])('reads mixed="%s"', (mixed, expected) => {
      const schema = read(
        `<xs:complexType name="C"><xs:complexContent mixed="${mixed}"><xs:extension base="xs:anyType"/></xs:complexContent></xs:complexType>`,
      );

      expect((complexType(schema, 'C').getContentModel() as XmlSchemaComplexContent).isMixed()).toBe(expected);
    });

    it('reads a group and an attribute group reference in an extension', () => {
      const schema = read(
        '<xs:group name="G"><xs:sequence/></xs:group><xs:attributeGroup name="AG"/>' +
          '<xs:complexType name="C"><xs:complexContent><xs:extension base="xs:anyType">' +
          '<xs:group ref="t:G"/><xs:attributeGroup ref="t:AG"/>' +
          '</xs:extension></xs:complexContent></xs:complexType>',
      );

      const extension = complexContentOf(schema, 'C') as XmlSchemaComplexContentExtension;
      expect((extension.getParticle() as XmlSchemaGroupRef).getRefName()?.toString()).toBe(q('G').toString());
      expect((extension.getAttributes()[0] as XmlSchemaAttributeGroupRef).getTargetQName()?.toString()).toBe(
        q('AG').toString(),
      );
    });

    it.each([
      ['choice', '<xs:choice/>', XmlSchemaChoice],
      ['all', '<xs:all/>', XmlSchemaAll],
      ['group reference', '<xs:group ref="t:G"/>', XmlSchemaGroupRef],
    ])('reads a %s as the particle of a restriction', (_, particle, particleClass) => {
      const schema = read(
        '<xs:group name="G"><xs:sequence/></xs:group>' +
          `<xs:complexType name="C"><xs:complexContent><xs:restriction base="xs:anyType">${particle}</xs:restriction></xs:complexContent></xs:complexType>`,
      );

      expect((complexContentOf(schema, 'C') as XmlSchemaComplexContentRestriction).getParticle()).toBeInstanceOf(
        particleClass,
      );
    });

    it('reads attributes and attribute group references in a restriction', () => {
      const schema = read(
        '<xs:attributeGroup name="AG"/>' +
          '<xs:complexType name="C"><xs:complexContent><xs:restriction base="xs:anyType">' +
          '<xs:attribute name="a" type="xs:string"/><xs:attributeGroup ref="t:AG"/>' +
          '</xs:restriction></xs:complexContent></xs:complexType>',
      );

      const [attribute, group] = (complexContentOf(schema, 'C') as XmlSchemaComplexContentRestriction).getAttributes();
      expect((attribute as XmlSchemaAttribute).getName()).toBe('a');
      expect((group as XmlSchemaAttributeGroupRef).getTargetQName()?.toString()).toBe(q('AG').toString());
    });
  });

  describe('simple content', () => {
    it('reads an attribute group reference in an extension', () => {
      const schema = read(
        '<xs:attributeGroup name="AG"/><xs:complexType name="C"><xs:simpleContent><xs:extension base="xs:string"><xs:attributeGroup ref="t:AG"/></xs:extension></xs:simpleContent></xs:complexType>',
      );

      const extension = simpleContentOf(schema, 'C') as XmlSchemaSimpleContentExtension;
      expect((extension.getAttributes()[0] as XmlSchemaAttributeGroupRef).getTargetQName()?.toString()).toBe(
        q('AG').toString(),
      );
    });

    it('reads the id, an inline base type and an attribute group reference of a restriction', () => {
      const schema = read(
        '<xs:attributeGroup name="AG"/>' +
          '<xs:complexType name="C"><xs:simpleContent><xs:restriction base="xs:string" id="r">' +
          '<xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType><xs:attributeGroup ref="t:AG"/>' +
          '</xs:restriction></xs:simpleContent></xs:complexType>',
      );

      const restriction = simpleContentOf(schema, 'C') as XmlSchemaSimpleContentRestriction;
      expect(restriction.getId()).toBe('r');
      expect(restriction.getBaseType()).toBeInstanceOf(XmlSchemaSimpleType);
      expect((restriction.getAttributes()[0] as XmlSchemaAttributeGroupRef).getTargetQName()?.toString()).toBe(
        q('AG').toString(),
      );
    });
  });

  describe('simple types', () => {
    it('reads the final derivation of a simple type', () => {
      const schema = read('<xs:simpleType name="S" final="list"><xs:restriction base="xs:string"/></xs:simpleType>');

      expect(simpleType(schema, 'S').getFinal().isList()).toBe(true);
    });

    it('reads an inline item type of a list', () => {
      const schema = read(
        '<xs:simpleType name="S"><xs:list><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:list></xs:simpleType>',
      );

      const list = simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeList;
      expect(list.getItemType()).toBeInstanceOf(XmlSchemaSimpleType);
      expect(list.getItemTypeName()).toBeUndefined();
    });

    it('reads an inline base type of a restriction without a base', () => {
      const schema = read(
        '<xs:simpleType name="S"><xs:restriction><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType><xs:maxInclusive value="9"/></xs:restriction></xs:simpleType>',
      );

      const restriction = simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeRestriction;
      expect(restriction.getBaseType()).toBeInstanceOf(XmlSchemaSimpleType);
      expect(restriction.getFacets()).toHaveLength(1);
    });

    it('reads the member types and the inline member types of a union', () => {
      const schema = read(
        '<xs:simpleType name="S"><xs:union memberTypes="xs:int">' +
          '<xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType>' +
          '<xs:simpleType><xs:restriction base="xs:date"/></xs:simpleType>' +
          '</xs:union></xs:simpleType>',
      );

      const union = simpleType(schema, 'S').getContent() as XmlSchemaSimpleTypeUnion;
      expect(union.getMemberTypesSource()).toBe('xs:int');
      expect(union.getBaseTypes()).toHaveLength(2);
    });
  });

  describe('notations', () => {
    it('reads a notation with its id, name and identifiers', () => {
      const schema = read('<xs:notation id="n" name="png" public="image/png" system="viewer.exe"/>');

      const notation = schema.getNotations().get(q('png'))!;
      expect(notation.getId()).toBe('n');
      expect(notation.getPublicNotation()).toBe('image/png');
      expect(notation.getSystem()).toBe('viewer.exe');
    });
  });

  describe('imports', () => {
    it('imports a schema without a target namespace when the import names none', () => {
      const schema = readFiles({
        'main.xsd': xsd(`<xs:import schemaLocation="plain.xsd">${NOTE}</xs:import>`),
        'plain.xsd': xsd('<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>', ''),
      });

      const schemaImport = schema.getExternals()[0] as XmlSchemaImport;
      expect(schemaImport.schema?.getTypeByName('Code')).toBeInstanceOf(XmlSchemaSimpleType);
      expect(documentationOf(schemaImport)).toBe('note');
    });

    it('rejects an imported schema whose namespace differs from the announced one', () => {
      const files = {
        'main.xsd': xsd('<xs:import namespace="urn:announced" schemaLocation="other.xsd"/>'),
        'other.xsd': xsd('', 'targetNamespace="urn:actual"'),
      };

      expect(() => readFiles(files)).toThrow(
        'An imported schema was announced to have the namespace urn:announced, but has the namespace urn:actual',
      );
    });
  });

  describe('includes', () => {
    it('reads the annotation of an include', () => {
      const schema = readFiles({
        'main.xsd': xsd(`<xs:include schemaLocation="types.xsd">${NOTE}</xs:include>`),
        'types.xsd': xsd('', ''),
      });

      expect(documentationOf(schema.getExternals()[0] as XmlSchemaInclude)).toBe('note');
    });

    it('reads a schema that is included twice only once', () => {
      const schema = readFiles({
        'main.xsd': xsd('<xs:include schemaLocation="types.xsd"/><xs:include schemaLocation="types.xsd"/>'),
        'types.xsd': xsd('', ''),
      });

      const [first, second] = schema.getExternals() as XmlSchemaInclude[];
      expect(second.schema).toBe(first.schema);
    });

    it('rejects an included schema with another target namespace', () => {
      const files = {
        'main.xsd': xsd('<xs:include schemaLocation="types.xsd"/>'),
        'types.xsd': xsd('', 'targetNamespace="urn:other"'),
      };

      expect(() => readFiles(files)).toThrow(
        `An included schema was announced to have the default target namespace or the target namespace ${NS}, but has the target namespace urn:other`,
      );
    });
  });

  describe('redefines', () => {
    it('reads the redefined simple types, attribute groups and the annotation', () => {
      const schema = readFiles({
        'main.xsd': xsd(
          '<xs:redefine schemaLocation="base.xsd">' +
            NOTE +
            '<xs:simpleType name="Code"><xs:restriction base="t:Code"><xs:maxLength value="3"/></xs:restriction></xs:simpleType>' +
            '<xs:attributeGroup name="Common"><xs:attributeGroup ref="t:Common"/><xs:attribute name="extra" type="xs:string"/></xs:attributeGroup>' +
            '</xs:redefine>',
        ),
        'base.xsd': xsd(
          '<xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>' +
            '<xs:attributeGroup name="Common"><xs:attribute name="id" type="xs:string"/></xs:attributeGroup>',
          '',
        ),
      });

      const redefine = schema.getExternals()[0] as XmlSchemaRedefine;
      const [type] = redefine.getSchemaTypes().values();
      const [attributeGroup] = redefine.getAttributeGroups().values();
      expect(type).toBeInstanceOf(XmlSchemaSimpleType);
      expect(type.getName()).toBe('Code');
      expect(attributeGroup.getName()).toBe('Common');
      expect(attributeGroup.getAttributes()).toHaveLength(2);
      expect(documentationOf(redefine)).toBe('note');
    });

    it('reads the redefined complex types and groups', () => {
      const schema = readFiles({
        'main.xsd': xsd(
          '<xs:redefine schemaLocation="base.xsd">' +
            '<xs:complexType name="Address"><xs:complexContent><xs:extension base="t:Address"><xs:sequence><xs:element name="country" type="xs:string"/></xs:sequence></xs:extension></xs:complexContent></xs:complexType>' +
            '<xs:group name="Lines"><xs:sequence><xs:group ref="t:Lines"/><xs:element name="line3" type="xs:string"/></xs:sequence></xs:group>' +
            '</xs:redefine>',
        ),
        'base.xsd': xsd(
          '<xs:complexType name="Address"><xs:sequence><xs:element name="city" type="xs:string"/></xs:sequence></xs:complexType>' +
            '<xs:group name="Lines"><xs:sequence><xs:element name="line1" type="xs:string"/></xs:sequence></xs:group>',
          '',
        ),
      });

      const redefine = schema.getExternals()[0] as XmlSchemaRedefine;
      const [type] = redefine.getSchemaTypes().values();
      const [group] = redefine.getGroups().values();
      expect(type).toBeInstanceOf(XmlSchemaComplexType);
      expect(type.getName()).toBe('Address');
      expect(group.getName()).toBe('Lines');
    });
  });

  describe('extension registry', () => {
    it('takes the extension registry of its collection', () => {
      const collection = new XmlSchemaCollection();

      const builder = new SchemaBuilder(collection);

      expect(builder.getExtReg()).toBe(collection.getExtReg());
    });

    it('hands the extension attributes to the extension registry it is given', () => {
      const deserialized: string[] = [];
      const registry = new ExtensionRegistry();
      registry.setDefaultExtensionDeserializer({ deserialize: (_, name) => deserialized.push(name.toString()) });
      const builder = new SchemaBuilder(new XmlSchemaCollection());
      const document = new DOMParser().parseFromString(
        xsd('<xs:element name="a" type="xs:string" xmlns:ext="urn:ext" ext:note="x"/>'),
        'text/xml',
      );

      builder.setExtReg(registry);
      builder.build(document);

      expect(deserialized).toContain(new QName('urn:ext', 'note').toString());
    });
  });
});
