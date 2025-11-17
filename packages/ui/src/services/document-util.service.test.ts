import { BODY_DOCUMENT_ID, DocumentType, Types } from '../models/datamapper';
import { camelSpringXsd, TestUtil } from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';

describe('DocumentUtilService', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();

  describe('getOwnerDocument()', () => {
    it('should return the document owner document', () => {
      let doc = DocumentUtilService.getOwnerDocument(sourceDoc.fields[0].fields[0]);
      expect(doc).toEqual(sourceDoc);
      doc = DocumentUtilService.getOwnerDocument(sourceDoc);
      expect(doc).toEqual(sourceDoc);
    });
  });

  describe('getFieldStack()', () => {
    it('should return field stack', () => {
      const stack = DocumentUtilService.getFieldStack(sourceDoc.fields[0].fields[1]);
      expect(stack.length).toEqual(1);
      expect(stack[0].name).toEqual('ShipOrder');
      const stackWithSelf = DocumentUtilService.getFieldStack(sourceDoc.fields[0].fields[1], true);
      expect(stackWithSelf.length).toEqual(2);
      expect(stackWithSelf[0].name).toEqual('OrderPerson');
    });
  });

  describe('resolveTypeFragment()', () => {
    it('should resolve type fragment', () => {
      const testDoc = TestUtil.createSourceOrderDoc();
      const testChildField = new XmlSchemaField(testDoc, 'testField', false);
      testChildField.type = Types.String;
      testDoc.namedTypeFragments['testFragment'] = {
        type: Types.Container,
        minOccurs: 1,
        maxOccurs: 1,
        namedTypeFragmentRefs: [],
        fields: [testChildField],
      };

      const refField = new XmlSchemaField(testDoc.fields[0], 'testRefField', false);
      refField.namedTypeFragmentRefs.push('testFragment');
      testDoc.fields[0].fields.push(refField);
      DocumentUtilService.resolveTypeFragment(refField);

      expect(refField.name).toEqual('testRefField');
      expect(refField.type).toEqual(Types.Container);
      expect(refField.minOccurs).toEqual(1);
      expect(refField.maxOccurs).toEqual(1);
      expect(refField.fields.length).toEqual(1);
      const refChildField = refField.fields[0];
      expect(refChildField.name).toEqual('testField');
      expect(refChildField.type).toEqual(Types.String);
    });

    it('should resolve collection type fragment', () => {
      const document = XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        camelSpringXsd,
        { namespaceUri: 'http://camel.apache.org/schema/spring', name: 'routes' },
      );

      const resolvedRoutes = DocumentUtilService.resolveTypeFragment(document.fields[0]);
      const route = resolvedRoutes.fields.find((f) => f.name === 'route');
      // https://github.com/KaotoIO/kaoto/issues/2457
      // occurrences must be taken from the referrer as opposed to the other attributes
      expect(route?.minOccurs).toEqual(0);
      expect(route?.maxOccurs).toEqual('unbounded');
    });
  });
});
