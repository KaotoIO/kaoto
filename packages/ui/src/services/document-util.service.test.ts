import { BODY_DOCUMENT_ID, DocumentType, Types } from '../models/datamapper';
import { IFieldTypeOverride } from '../models/datamapper/metadata';
import { TypeOverrideVariant } from '../models/datamapper/types';
import { NS_XML_SCHEMA } from '../models/datamapper/xslt';
import { camelSpringXsd, TestUtil } from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document-model.service';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaField } from './xml-schema-document-model.service';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';

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

  describe('adoptTypeFragment()', () => {
    it('should adopt type when fragment has type defined', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const fragment = {
        type: Types.String,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.type).toBe(Types.String);
    });

    it('should adopt minOccurs when fragment has it defined', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const fragment = {
        minOccurs: 5,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.minOccurs).toBe(5);
    });

    it('should adopt maxOccurs when fragment has it defined', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const fragment = {
        maxOccurs: 10,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.maxOccurs).toBe(10);
    });

    it('should adopt all fields from fragment', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.Container);

      const fragmentField1 = new JsonSchemaField(doc, 'child1', Types.String);
      const fragmentField2 = new JsonSchemaField(doc, 'child2', Types.Integer);

      const fragment = {
        fields: [fragmentField1, fragmentField2],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.fields.length).toBe(2);
    });
  });

  describe('applyFieldTypeOverrides()', () => {
    it('should not modify document when no overrides provided', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.String);
      doc.fields = [field];

      DocumentUtilService.applyFieldTypeOverrides(doc, [], {}, XmlSchemaDocumentUtilService.parseTypeOverride);

      expect(field.type).toBe(Types.String);
      expect(field.typeOverride).toBe(TypeOverrideVariant.NONE);
    });

    it('should apply type override to top-level field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const overrides: IFieldTypeOverride[] = [
        {
          path: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaDocumentUtilService.parseTypeOverride,
      );

      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.type).toBe(Types.Integer);
      expect(orderPerson?.typeOverride).toBe(TypeOverrideVariant.FORCE);
    });

    it('should apply type override to nested field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const overrides: IFieldTypeOverride[] = [
        {
          path: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaDocumentUtilService.parseTypeOverride,
      );

      const shipTo = doc.fields[0].fields.find((f) => f.name === 'ShipTo');
      const city = shipTo?.fields.find((f) => f.name === 'City');
      expect(city?.type).toBe(Types.Integer);
      expect(city?.typeOverride).toBe(TypeOverrideVariant.FORCE);
      expect(city?.fields).toEqual([]);
    });

    it('should apply multiple type overrides', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const overrides: IFieldTypeOverride[] = [
        {
          path: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
        {
          path: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaDocumentUtilService.parseTypeOverride,
      );

      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.type).toBe(Types.Integer);

      const shipTo = doc.fields[0].fields.find((f) => f.name === 'ShipTo');
      const city = shipTo?.fields.find((f) => f.name === 'City');
      expect(city?.type).toBe(Types.Boolean);
    });

    it('should set namedTypeFragmentRefs for Container type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const overrides: IFieldTypeOverride[] = [
        {
          path: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'ns0:CustomType',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.SAFE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaDocumentUtilService.parseTypeOverride,
      );

      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.type).toBe(Types.Container);
      expect(orderPerson?.namedTypeFragmentRefs).toHaveLength(1);
      expect(orderPerson?.fields).toEqual([]);
    });
  });
});
