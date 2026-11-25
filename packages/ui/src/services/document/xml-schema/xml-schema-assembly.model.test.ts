import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../models/datamapper';
import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { TestUtil, TYPE_BINDING_COLLISION_NS } from '../../../stubs/datamapper/data-mapper';
import {
  XmlSchemaAttributeGroup,
  XmlSchemaAttributeGroupRef,
  XmlSchemaComplexContentExtension,
  XmlSchemaComplexType,
  XmlSchemaGroup,
  XmlSchemaGroupRef,
  XmlSchemaSequence,
} from '../../../xml-schema-ts';
import { XmlSchemaRedefine } from '../../../xml-schema-ts/external/XmlSchemaRedefine';
import { QName } from '../../../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeRestriction } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { XmlSchema } from '../../../xml-schema-ts/XmlSchema';
import { XmlSchemaCollection } from '../../../xml-schema-ts/XmlSchemaCollection';
import { XmlSchemaAssembly } from './xml-schema-assembly.model';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';

describe('XmlSchemaAssembly', () => {
  const t = (localPart: string) => new QName(TYPE_BINDING_COLLISION_NS.t, localPart);
  const sourceOf = (component: { getParent(): XmlSchema | null } | null) => component?.getParent()?.getSourceURI();

  const createCollisionDoc = (order: 'before' | 'after') => {
    const definition = TestUtil.createTypeBindingCollisionDefinition('OtherSimpleKind', order);
    return XmlSchemaDocumentService.createXmlSchemaDocument(definition).document as XmlSchemaDocument;
  };

  const loadFiles = (collection: XmlSchemaCollection, files: Record<string, string>) => {
    collection.getSchemaResolver().addFiles(files);
    for (const [path, content] of Object.entries(files)) {
      collection.read(content, () => {}, path);
    }
  };

  describe('entry first, then the collection', () => {
    it('should find types and groups of the entry before same-QName components of a file parsed earlier', () => {
      const doc = createCollisionDoc('before');
      const { assembly } = doc;

      expect(assembly.entrySchemaFile).toBe('Entry.xsd');
      expect(sourceOf(assembly.lookupType(t('CT')))).toBe('Types.xsd');
      expect(sourceOf(assembly.lookupTypeOrBuiltIn(t('Code')))).toBe('Types.xsd');
      expect(sourceOf(assembly.lookupGroup(t('G')))).toBe('Types.xsd');
    });

    it('should find the first declaration in the collection without an entry', () => {
      const doc = createCollisionDoc('before');
      const assembly = new XmlSchemaAssembly(doc.xmlSchemaCollection);

      expect(sourceOf(assembly.lookupType(t('CT')))).toBe('OtherSimpleKind.xsd');
      expect(sourceOf(assembly.lookupGroup(t('G')))).toBe('OtherSimpleKind.xsd');
    });

    it('should fall back to the collection for a type the entry does not reach', () => {
      const doc = createCollisionDoc('before');

      expect(sourceOf(doc.assembly.lookupType(t('CT2')))).toBe('OtherSimpleKind.xsd');
    });

    it('should find an element of the entry before a same-QName element of a file parsed earlier', () => {
      const ns = 'urn:e';
      const files = {
        'Other.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}"><xs:element name="E" type="xs:int"/></xs:schema>`,
        'Entry.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}"><xs:element name="E" type="xs:string"/></xs:schema>`,
      };
      const collection = new XmlSchemaCollection();
      loadFiles(collection, files);
      const qName = new QName(ns, 'E');

      expect(sourceOf(new XmlSchemaAssembly(collection, 'Entry.xsd').lookupElement(qName))).toBe('Entry.xsd');
      expect(sourceOf(new XmlSchemaAssembly(collection).lookupElement(qName))).toBe('Other.xsd');
    });

    it('should find attributes and attribute groups of the entry before same-QName ones of a file parsed earlier', () => {
      const ns = 'urn:a';
      const declare = (attrType: string, groupAttr: string) =>
        `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}"><xs:attribute name="A" type="xs:${attrType}"/><xs:attributeGroup name="AG"><xs:attribute name="${groupAttr}" type="xs:string"/></xs:attributeGroup></xs:schema>`;
      const files = {
        'Other.xsd': declare('int', 'fromOther'),
        'Entry.xsd': declare('string', 'fromEntry'),
        'Only.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}"><xs:attribute name="OnlyA" type="xs:int"/><xs:attributeGroup name="OnlyAG"/></xs:schema>`,
      };
      const collection = new XmlSchemaCollection();
      loadFiles(collection, files);
      const entryAssembly = new XmlSchemaAssembly(collection, 'Entry.xsd');
      const attribute = new QName(ns, 'A');
      const group = new QName(ns, 'AG');

      expect(sourceOf(entryAssembly.lookupAttribute(attribute))).toBe('Entry.xsd');
      expect(sourceOf(entryAssembly.lookupAttributeGroup(group))).toBe('Entry.xsd');
      expect(sourceOf(new XmlSchemaAssembly(collection).lookupAttribute(attribute))).toBe('Other.xsd');
      expect(sourceOf(new XmlSchemaAssembly(collection).lookupAttributeGroup(group))).toBe('Other.xsd');
      expect(sourceOf(entryAssembly.lookupAttribute(new QName(ns, 'OnlyA')))).toBe('Only.xsd');
      expect(sourceOf(entryAssembly.lookupAttributeGroup(new QName(ns, 'OnlyAG')))).toBe('Only.xsd');
      expect(entryAssembly.lookupAttribute(new QName(ns, 'Missing'))).toBeNull();
      expect(entryAssembly.lookupAttributeGroup(new QName(ns, 'Missing'))).toBeNull();
      expect(entryAssembly.lookupAttribute(null)).toBeNull();
      expect(entryAssembly.lookupAttributeGroup(null)).toBeNull();
    });

    it('should read the collection at every lookup', () => {
      const ns = 'urn:late';
      const collection = new XmlSchemaCollection();
      const assembly = new XmlSchemaAssembly(collection, 'Late.xsd');
      const qName = new QName(ns, 'LateType');
      expect(assembly.lookupType(qName)).toBeNull();

      const files = {
        'Late.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}"><xs:simpleType name="LateType"><xs:restriction base="xs:string"/></xs:simpleType></xs:schema>`,
      };
      loadFiles(collection, files);

      expect(sourceOf(assembly.lookupType(qName))).toBe('Late.xsd');
    });
  });

  describe('built-in types', () => {
    it('should resolve built-in types only through lookupTypeOrBuiltIn', () => {
      const { assembly } = createCollisionDoc('before');
      const xsString = new QName(NS_XML_SCHEMA, 'string');

      expect(assembly.lookupType(xsString)).toBeNull();
      expect(assembly.lookupTypeOrBuiltIn(xsString)?.getQName()?.toString()).toBe(xsString.toString());
    });

    it('should not go through lookupType from lookupTypeOrBuiltIn', () => {
      const { assembly } = createCollisionDoc('before');
      const spy = vi.spyOn(assembly, 'lookupType');

      expect(sourceOf(assembly.lookupTypeOrBuiltIn(t('CT')))).toBe('Types.xsd');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('resolveElementSchemaType()', () => {
    it('should resolve a named element type through the assembly instead of the type bound at parse time', () => {
      const doc = createCollisionDoc('before');
      const element = doc.assembly.lookupElement(t('M'))!;

      expect(sourceOf(element.getSchemaType())).toBe('OtherSimpleKind.xsd');
      expect(sourceOf(doc.assembly.resolveElementSchemaType(element))).toBe('Types.xsd');
    });

    it('should return the bound type of an element with an anonymous type', () => {
      const doc = createCollisionDoc('before');
      const element = doc.assembly.lookupElement(t('R'))!;

      expect(element.getSchemaTypeName()).toBeNull();
      expect(doc.assembly.resolveElementSchemaType(element)).toBe(element.getSchemaType());
    });
  });

  describe('without an entry', () => {
    it('should delegate every lookup to the collection', () => {
      const doc = createCollisionDoc('after');
      const collection = doc.xmlSchemaCollection;
      const assembly = new XmlSchemaAssembly(collection);
      const getTypeByQName = vi.spyOn(collection, 'getTypeByQName');
      const getElementByQName = vi.spyOn(collection, 'getElementByQName');
      const getGroupByQName = vi.spyOn(collection, 'getGroupByQName');
      const getAttributeByQName = vi.spyOn(collection, 'getAttributeByQName');
      const getAttributeGroupByQName = vi.spyOn(collection, 'getAttributeGroupByQName');
      const getXmlSchema = vi.spyOn(collection, 'getXmlSchema');

      assembly.lookupType(t('CT'));
      assembly.lookupElement(t('M'));
      assembly.lookupGroup(t('G'));
      assembly.lookupAttribute(t('a'));
      assembly.lookupAttributeGroup(t('AG'));

      expect(getTypeByQName).toHaveBeenCalledWith(t('CT'));
      expect(getElementByQName).toHaveBeenCalledWith(t('M'));
      expect(getGroupByQName).toHaveBeenCalledWith(t('G'));
      expect(getAttributeByQName).toHaveBeenCalledWith(t('a'));
      expect(getAttributeGroupByQName).toHaveBeenCalledWith(t('AG'));
      expect(getXmlSchema).not.toHaveBeenCalled();
    });
  });

  describe('lookupElement() and lookupGroup()', () => {
    it('should return null when element or group QName is null', () => {
      const doc = TestUtil.createSourceOrderDoc();
      expect(doc.assembly.lookupElement(null)).toBeNull();
      expect(doc.assembly.lookupGroup(null)).toBeNull();
    });

    it('should lookup schema element by QName', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const firstEl = XmlSchemaDocumentUtilService.getFirstElement(doc.xmlSchemaCollection);
      const qname = firstEl?.getQName();
      expect(qname).toBeDefined();

      const found = doc.assembly.lookupElement(qname!);
      expect(found).toBeDefined();
      expect(found?.getQName()?.toString()).toBe(qname?.toString());
    });

    it('should return null when element is not found', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const notFound = doc.assembly.lookupElement(new QName('http://nonexistent', 'NonExistent'));
      expect(notFound).toBeNull();
    });

    it('should visit each schema once per scoped lookup in a diamond-shaped include graph', () => {
      const levels = 12;
      const wrap = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">${body}</xs:schema>`;
      const include = (file: string) => `<xs:include schemaLocation="${file}"/>`;
      const files: Record<string, string> = {};
      for (let i = 0; i < levels; i++) {
        files[`N${i}.xsd`] = wrap(include(`A${i}.xsd`) + include(`B${i}.xsd`));
        const next = i + 1 < levels ? include(`N${i + 1}.xsd`) : '<xs:element name="Leaf" type="xs:string"/>';
        files[`A${i}.xsd`] = wrap(next);
        files[`B${i}.xsd`] = wrap(next);
      }
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
        undefined,
        undefined,
        undefined,
        undefined,
        'N0.xsd',
      );
      const { document } = XmlSchemaDocumentService.createXmlSchemaDocument(definition);

      const spy = vi.spyOn(XmlSchema.prototype, 'getElementByQName');
      const found = document!.assembly.findElementInEntry(new QName('', 'Missing'));

      expect(found).toBeNull();
      // 2^12 paths reach the leaf; one visit per schema keeps it near files x edges.
      const visited = spy.mock.contexts.map((schema) => (schema as XmlSchema).getSourceURI());
      expect(visited).toHaveLength(Object.keys(files).length);
      expect(new Set(visited)).toEqual(new Set(Object.keys(files)));
      expect(spy.mock.calls.every(([, deep]) => deep === false)).toBe(true);
      spy.mockRestore();
    });
  });

  describe('with xs:redefine', () => {
    const x = (localPart: string) => new QName('urn:x', localPart);
    const BASE_FIRST = ['base.xsd', 'implementation.xsd'];
    const schemaOf = (doc: XmlSchemaDocument, file: string) => doc.xmlSchemaCollection.getXmlSchema(file)[0];
    const redefineOf = (doc: XmlSchemaDocument) =>
      schemaOf(doc, 'implementation.xsd')
        .getExternals()
        .find((external) => external instanceof XmlSchemaRedefine) as XmlSchemaRedefine;

    it('should find components declared only in the redefined schema before same-QName ones of an unrelated file', () => {
      for (const order of [
        ['implementation.xsd', 'base.xsd', 'other.xsd'],
        ['other.xsd', 'implementation.xsd', 'base.xsd'],
      ]) {
        const { assembly } = TestUtil.createRedefineDoc('redefine/shadowing', order);

        expect(sourceOf(assembly.lookupType(x('BT')))).toBe('base.xsd');
        expect(sourceOf(assembly.lookupGroup(x('BG')))).toBe('base.xsd');
        expect(sourceOf(assembly.lookupAttribute(x('ba')))).toBe('base.xsd');
        expect(sourceOf(assembly.lookupAttributeGroup(x('BAG')))).toBe('base.xsd');
        expect(sourceOf(assembly.findElementInEntry(x('BaseRoot')))).toBe('base.xsd');
      }
    });

    it('should find a redefined simple type before the base reached through an earlier include', () => {
      for (const order of [
        ['base.xsd', 'inc.xsd', 'implementation.xsd'],
        ['implementation.xsd', 'inc.xsd', 'base.xsd'],
      ]) {
        const doc = TestUtil.createRedefineDoc('redefine/include-before-redefine', order);

        expect(doc.assembly.lookupType(x('S'))).toBe(redefineOf(doc).getSchemaTypes().get(x('S')));
      }
    });

    it.each([true, false])(
      'should resolve a self-reference one layer down, and through the entry any other reference to the redefinition (with entry: %s)',
      (withEntry) => {
        const doc = TestUtil.createRedefineDoc('redefine/same-namespace', BASE_FIRST);
        const assembly = withEntry ? doc.assembly : new XmlSchemaAssembly(doc.xmlSchemaCollection);
        const base = schemaOf(doc, 'base.xsd');
        const redefine = redefineOf(doc);
        const redefinedGroup = redefine.getGroups().get(x('G')) as XmlSchemaGroup;
        const redefinedAttributeGroup = redefine.getAttributeGroups().get(x('AG')) as XmlSchemaAttributeGroup;
        const redefinedType = redefine.getSchemaTypes().get(x('T')) as XmlSchemaComplexType;
        const holder = base.getSchemaTypes().get(x('H')) as XmlSchemaComplexType;

        const selfGroupRef = (redefinedGroup.getParticle() as XmlSchemaSequence).getItems()[0] as XmlSchemaGroupRef;
        const otherGroupRef = (holder.getParticle() as XmlSchemaSequence).getItems()[0] as XmlSchemaGroupRef;
        const selfAttributeGroupRef = redefinedAttributeGroup.getAttributes()[0] as XmlSchemaAttributeGroupRef;
        const otherAttributeGroupRef = holder.getAttributes()[0] as XmlSchemaAttributeGroupRef;
        const selfDerivation = redefinedType.getContentModel()?.getContent() as XmlSchemaComplexContentExtension;

        expect(assembly.resolveGroupRef(selfGroupRef)).toBe(base.getGroups().get(x('G')));
        expect(assembly.resolveAttributeGroupRef(selfAttributeGroupRef)).toBe(base.getAttributeGroups().get(x('AG')));
        expect(assembly.resolveDerivationBase(selfDerivation)).toBe(base.getSchemaTypes().get(x('T')));
        expect(assembly.resolveDerivationBaseOrBuiltIn(selfDerivation)).toBe(base.getSchemaTypes().get(x('T')));
        if (withEntry) {
          expect(assembly.resolveGroupRef(otherGroupRef)).toBe(redefinedGroup);
          expect(assembly.resolveAttributeGroupRef(otherAttributeGroupRef)).toBe(redefinedAttributeGroup);
        }
      },
    );

    it('should resolve a self-reference to null when the redefined schema is missing', () => {
      const doc = TestUtil.createRedefineDoc('redefine/same-namespace', BASE_FIRST);
      const redefine = redefineOf(doc);
      const redefinedGroup = redefine.getGroups().get(x('G')) as XmlSchemaGroup;
      const selfGroupRef = (redefinedGroup.getParticle() as XmlSchemaSequence).getItems()[0] as XmlSchemaGroupRef;
      redefine.schema = null;

      expect(doc.assembly.resolveGroupRef(selfGroupRef)).toBeNull();
    });

    it('should terminate lookups and self-references in mutually redefining files', () => {
      const doc = TestUtil.createRedefineDoc('redefine/cycle', ['A.xsd', 'B.xsd'], 'A.xsd');
      const typeOfA = doc.assembly.lookupType(new QName('', 'T')) as XmlSchemaComplexType;
      const derivation = typeOfA.getContentModel()?.getContent() as XmlSchemaComplexContentExtension;

      expect(sourceOf(typeOfA)).toBe('A.xsd');
      expect(sourceOf(doc.assembly.resolveDerivationBase(derivation))).toBe('B.xsd');
      expect(doc.assembly.lookupType(new QName('', 'Missing'))).toBeNull();
    });

    it('should resolve a reference without a QName to null', () => {
      const doc = TestUtil.createRedefineDoc('redefine/same-namespace', BASE_FIRST);
      const { assembly } = doc;
      const attributeGroupRef = new XmlSchemaAttributeGroupRef(schemaOf(doc, 'base.xsd'));

      expect(assembly.resolveGroupRef(new XmlSchemaGroupRef())).toBeNull();
      expect(assembly.resolveAttributeGroupRef(attributeGroupRef)).toBeNull();
      expect(assembly.resolveDerivationBase(new XmlSchemaSimpleTypeRestriction())).toBeNull();
      expect(assembly.resolveDerivationBaseOrBuiltIn(new XmlSchemaSimpleTypeRestriction())).toBeNull();
      expect(assembly.lookupGroup(x('Missing'))).toBeNull();
    });

    it('should not take a redefined complex type without a content model for a self-derivation (invalid set)', () => {
      const wrap = (body: string) =>
        `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:x="urn:x" targetNamespace="urn:x">${body}</xs:schema>`;
      const collection = new XmlSchemaCollection();
      loadFiles(collection, {
        'base.xsd': wrap('<xs:complexType name="T"><xs:sequence/></xs:complexType>'),
        'implementation.xsd': wrap(
          '<xs:redefine schemaLocation="base.xsd"><xs:complexType name="T"><xs:sequence/></xs:complexType></xs:redefine>' +
            '<xs:complexType name="D"><xs:complexContent><xs:extension base="x:T"/></xs:complexContent></xs:complexType>',
        ),
      });
      const implementation = collection.getXmlSchema('implementation.xsd')[0];
      const derived = implementation.getSchemaTypes().get(x('D')) as XmlSchemaComplexType;
      const derivation = derived.getContentModel()?.getContent() as XmlSchemaComplexContentExtension;

      expect(new XmlSchemaAssembly(collection, 'implementation.xsd').resolveDerivationBase(derivation)).toBe(
        implementation.getSchemaTypes().get(x('T')),
      );
    });

    it('should not find an element outside the entry, nor without an entry', () => {
      const doc = TestUtil.createRedefineDoc('redefine/shadowing', ['implementation.xsd', 'base.xsd', 'other.xsd']);

      expect(sourceOf(doc.assembly.lookupElement(x('OtherRoot')))).toBe('other.xsd');
      expect(doc.assembly.findElementInEntry(x('OtherRoot'))).toBeNull();
      expect(doc.assembly.findElementInEntry(x('Missing'))).toBeNull();
      expect(doc.assembly.findElementInEntry(null)).toBeNull();
      expect(new XmlSchemaAssembly(doc.xmlSchemaCollection).findElementInEntry(x('Root'))).toBeNull();
    });
  });
});
