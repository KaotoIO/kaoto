import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  Types,
} from '../models/datamapper';
import { IFieldTypeOverride } from '../models/datamapper/metadata';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { TypeOverrideVariant } from '../models/datamapper/types';
import { camelSpringXsd, lazyLoadingTestXsd, TestUtil } from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

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
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'camel-spring.xsd': camelSpringXsd },
        { namespaceUri: 'http://camel.apache.org/schema/spring', name: 'routes' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document!;

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
      const doc = TestUtil.createSourceOrderDoc();
      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.AnyType;

      const fragment = {
        type: Types.String,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.type).toBe(Types.String);
    });

    it('should adopt minOccurs when fragment has it defined', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.String;

      const fragment = {
        minOccurs: 5,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.minOccurs).toBe(5);
    });

    it('should adopt maxOccurs when fragment has it defined', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.String;

      const fragment = {
        maxOccurs: 10,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.maxOccurs).toBe(10);
    });

    it('should adopt all fields from fragment', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.Container;

      const fragmentField1 = new XmlSchemaField(doc, 'child1', false);
      fragmentField1.type = Types.String;
      const fragmentField2 = new XmlSchemaField(doc, 'child2', false);
      fragmentField2.type = Types.Integer;

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
      const doc = TestUtil.createSourceOrderDoc();
      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');

      DocumentUtilService.applyFieldTypeOverrides(doc, [], {}, XmlSchemaTypesService.parseTypeOverride);

      expect(orderPerson?.type).toBe(Types.String);
      expect(orderPerson?.typeOverride).toBe(TypeOverrideVariant.NONE);
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
        XmlSchemaTypesService.parseTypeOverride,
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
        XmlSchemaTypesService.parseTypeOverride,
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
        XmlSchemaTypesService.parseTypeOverride,
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
        XmlSchemaTypesService.parseTypeOverride,
      );

      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.type).toBe(Types.Container);
      expect(orderPerson?.namedTypeFragmentRefs).toHaveLength(1);
      expect(orderPerson?.fields).toEqual([]);
    });

    it('should not resolve type fragments for fields without overrides', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'lazy.xsd': lazyLoadingTestXsd },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { tns: 'http://www.example.com/LAZYTEST', xs: NS_XML_SCHEMA };

      const personBeforeOverride = doc.fields[0].fields.find((f) => f.name === 'Person');
      const companyBeforeOverride = doc.fields[0].fields.find((f) => f.name === 'Company');
      expect(personBeforeOverride?.namedTypeFragmentRefs).toHaveLength(1);
      expect(personBeforeOverride?.fields).toHaveLength(0);
      expect(companyBeforeOverride?.namedTypeFragmentRefs).toHaveLength(1);
      expect(companyBeforeOverride?.fields).toHaveLength(0);

      const overrides: IFieldTypeOverride[] = [
        {
          path: '/tns:Root/tns:Person/tns:Name',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaTypesService.parseTypeOverride,
      );

      const companyAfterOverride = doc.fields[0].fields.find((f) => f.name === 'Company');
      expect(companyAfterOverride?.namedTypeFragmentRefs).toHaveLength(1);
      expect(companyAfterOverride?.fields).toHaveLength(0);
    });

    it('should only resolve fragments along the path to override', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'lazy.xsd': lazyLoadingTestXsd },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { tns: 'http://www.example.com/LAZYTEST', xs: NS_XML_SCHEMA };

      const personBeforeOverride = doc.fields[0].fields.find((f) => f.name === 'Person');
      expect(personBeforeOverride?.namedTypeFragmentRefs).toHaveLength(1);
      expect(personBeforeOverride?.fields).toHaveLength(0);

      const overrides: IFieldTypeOverride[] = [
        {
          path: '/tns:Root/tns:Person/tns:Address/tns:City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaTypesService.parseTypeOverride,
      );

      const personAfterOverride = doc.fields[0].fields.find((f) => f.name === 'Person');
      expect(personAfterOverride?.namedTypeFragmentRefs).toHaveLength(0);

      const contactField = personAfterOverride?.fields.find((f) => f.name === 'Contact');
      expect(contactField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(contactField?.fields).toHaveLength(0);
    });

    it('should handle multiple overrides in different branches efficiently', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'lazy.xsd': lazyLoadingTestXsd },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { tns: 'http://www.example.com/LAZYTEST', xs: NS_XML_SCHEMA };

      const personBeforeOverride = doc.fields[0].fields.find((f) => f.name === 'Person');
      const companyBeforeOverride = doc.fields[0].fields.find((f) => f.name === 'Company');
      expect(personBeforeOverride?.namedTypeFragmentRefs).toHaveLength(1);
      expect(personBeforeOverride?.fields).toHaveLength(0);
      expect(companyBeforeOverride?.namedTypeFragmentRefs).toHaveLength(1);
      expect(companyBeforeOverride?.fields).toHaveLength(0);

      const overrides: IFieldTypeOverride[] = [
        {
          path: '/tns:Root/tns:Person/tns:Name',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
        {
          path: '/tns:Root/tns:Company/tns:CompanyName',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.applyFieldTypeOverrides(
        doc,
        overrides,
        namespaceMap,
        XmlSchemaTypesService.parseTypeOverride,
      );

      const personAfterOverride = doc.fields[0].fields.find((f) => f.name === 'Person');
      const nameField = personAfterOverride?.fields.find((f) => f.name === 'Name');
      expect(nameField?.type).toBe(Types.Integer);

      const companyAfterOverride = doc.fields[0].fields.find((f) => f.name === 'Company');
      const companyNameField = companyAfterOverride?.fields.find((f) => f.name === 'CompanyName');
      expect(companyNameField?.type).toBe(Types.Boolean);

      const personAddressField = personAfterOverride?.fields.find((f) => f.name === 'Address');
      const personContactField = personAfterOverride?.fields.find((f) => f.name === 'Contact');
      expect(personAddressField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(personAddressField?.fields).toHaveLength(0);
      expect(personContactField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(personContactField?.fields).toHaveLength(0);

      const companyAddressField = companyAfterOverride?.fields.find((f) => f.name === 'HeadOffice');
      const companyContactField = companyAfterOverride?.fields.find((f) => f.name === 'CompanyContact');
      expect(companyAddressField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(companyAddressField?.fields).toHaveLength(0);
      expect(companyContactField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(companyContactField?.fields).toHaveLength(0);
    });
  });
});
