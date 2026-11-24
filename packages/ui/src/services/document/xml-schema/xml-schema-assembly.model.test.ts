import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../models/datamapper';
import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { TestUtil, TYPE_BINDING_COLLISION_NS } from '../../../stubs/datamapper/data-mapper';
import { QName } from '../../../xml-schema-ts/QName';
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
      const getXmlSchema = vi.spyOn(collection, 'getXmlSchema');

      assembly.lookupType(t('CT'));
      assembly.lookupElement(t('M'));
      assembly.lookupGroup(t('G'));

      expect(getTypeByQName).toHaveBeenCalledWith(t('CT'));
      expect(getElementByQName).toHaveBeenCalledWith(t('M'));
      expect(getGroupByQName).toHaveBeenCalledWith(t('G'));
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
      const found = document!.assembly.lookupElement(new QName('', 'Missing'));

      expect(found).toBeNull();
      // 2^12 paths reach the leaf; one visit per schema keeps it near files x edges.
      expect(spy.mock.calls.length).toBeLessThan(Object.keys(files).length ** 2 * 4);
      spy.mockRestore();
    });
  });
});
