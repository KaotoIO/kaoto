import { TestUtil } from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { Types } from '../models/datamapper';
import { XmlSchemaField } from './xml-schema-document.service';

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
  });
});
