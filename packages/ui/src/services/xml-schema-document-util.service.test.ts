import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper';
import { BaseDocument } from '../models/datamapper/document';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import {
  accountLcXsd,
  accountNs2Xsd,
  accountNsXsd,
  extensionComplexXsd,
  multipleElementsXsd,
  restrictionComplexXsd,
  simpleTypeInheritanceXsd,
  simpleTypeRestrictionXsd,
  TestUtil,
} from '../stubs/datamapper/data-mapper';
import { QName } from '../xml-schema-ts/QName';
import { XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

describe('XmlSchemaDocumentUtilService', () => {
  describe('getFirstElement()', () => {
    it('should return the first element from an XML Schema', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const firstElement = XmlSchemaDocumentUtilService.getFirstElement(doc.xmlSchemaCollection);

      expect(firstElement).toBeDefined();
      expect(firstElement!.getName()).toBeTruthy();
    });
  });

  describe('getChildField()', () => {
    it('should find child field by name', () => {
      const mockParent = {
        fields: [
          { name: 'OrderPerson', namespaceURI: null },
          { name: 'ShipTo', namespaceURI: null },
        ],
      } as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'OrderPerson');

      expect(result).toBeDefined();
      expect(result?.name).toBe('OrderPerson');
    });

    it('should find child field by name and namespace', () => {
      const mockParent = {
        fields: [
          { name: 'ShipTo', namespaceURI: 'http://www.kaoto.io/order' },
          { name: 'ShipTo', namespaceURI: 'http://different-namespace.com' },
        ],
      } as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'ShipTo', 'http://www.kaoto.io/order');

      expect(result).toBeDefined();
      expect(result?.name).toBe('ShipTo');
      expect(result?.namespaceURI).toBe('http://www.kaoto.io/order');
    });

    it('should return undefined when name does not match', () => {
      const mockParent = {
        fields: [{ name: 'ShipTo', namespaceURI: null }],
      } as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'NonExistentField');

      expect(result).toBeUndefined();
    });

    it('should return undefined when namespace does not match', () => {
      const mockParent = {
        fields: [{ name: 'ShipTo', namespaceURI: 'http://www.kaoto.io/order' }],
      } as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'ShipTo', 'http://different-namespace.com');

      expect(result).toBeUndefined();
    });

    it('should find field inside choice member', () => {
      const mockParent = {
        fields: [
          { name: 'RegularField', namespaceURI: null, isChoice: false, fields: [] },
          {
            name: 'ContactChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [
              { name: 'email', namespaceURI: null, fields: [] },
              { name: 'phone', namespaceURI: null, fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email');

      expect(result).toBeDefined();
      expect(result?.name).toBe('email');
    });

    it('should find field with namespace inside choice member', () => {
      const mockParent = {
        fields: [
          {
            name: 'ContactChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [
              { name: 'email', namespaceURI: 'http://www.kaoto.io/contact', fields: [] },
              { name: 'phone', namespaceURI: 'http://www.kaoto.io/contact', fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email', 'http://www.kaoto.io/contact');

      expect(result).toBeDefined();
      expect(result?.name).toBe('email');
      expect(result?.namespaceURI).toBe('http://www.kaoto.io/contact');
    });

    it('should prefer direct child over choice member with same name', () => {
      const mockParent = {
        fields: [
          { name: 'email', namespaceURI: null, isChoice: false, fields: [] },
          {
            name: 'ContactChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [{ name: 'email', namespaceURI: 'http://different.com', fields: [] }],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email');

      expect(result?.namespaceURI).toBeNull();
    });

    it('should find field in nested choice', () => {
      const mockParent = {
        fields: [
          {
            name: 'OuterChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [
              {
                name: 'InnerChoice',
                namespaceURI: null,
                isChoice: true,
                fields: [{ name: 'deepField', namespaceURI: null, fields: [] }],
              },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'deepField');

      expect(result).toBeDefined();
      expect(result?.name).toBe('deepField');
    });

    it('should return undefined when field not found in choice or regular fields', () => {
      const mockParent = {
        fields: [
          { name: 'RegularField', namespaceURI: null, isChoice: false, fields: [] },
          {
            name: 'ContactChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [
              { name: 'email', namespaceURI: null, fields: [] },
              { name: 'phone', namespaceURI: null, fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('should handle empty choice', () => {
      const mockParent = {
        fields: [
          { name: 'RegularField', namespaceURI: null, isChoice: false, fields: [] },
          {
            name: 'EmptyChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email');

      expect(result).toBeUndefined();
    });

    it('should handle multiple choices in same parent', () => {
      const mockParent = {
        fields: [
          {
            name: 'ContactChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [
              { name: 'email', namespaceURI: null, fields: [] },
              { name: 'phone', namespaceURI: null, fields: [] },
            ],
          },
          {
            name: 'AddressChoice',
            namespaceURI: null,
            isChoice: true,
            fields: [
              { name: 'street', namespaceURI: null, fields: [] },
              { name: 'city', namespaceURI: null, fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const emailResult = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email');
      expect(emailResult).toBeDefined();
      expect(emailResult?.name).toBe('email');

      const streetResult = XmlSchemaDocumentUtilService.getChildField(mockParent, 'street');
      expect(streetResult).toBeDefined();
      expect(streetResult?.name).toBe('street');
    });
  });

  describe('parseTypeOverride()', () => {
    it('should parse xs:string type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:string', namespaceMap, field);

      expect(result.type).toBe(Types.String);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'string'));
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should parse xs:int type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:int', namespaceMap, field);

      expect(result.type).toBe(Types.Integer);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'int'));
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should parse xs:boolean type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:boolean', namespaceMap, field);

      expect(result.type).toBe(Types.Boolean);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'boolean'));
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should parse xs:date type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:date', namespaceMap, field);

      expect(result.type).toBe(Types.Date);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'date'));
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should parse xs:decimal type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:decimal', namespaceMap, field);

      expect(result.type).toBe(Types.Decimal);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'decimal'));
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should parse custom type override with FORCE variant', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipTo = doc.fields[0].fields.find((f) => f.name === 'ShipTo');
      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'http://www.kaoto.io/order' };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:string', namespaceMap, shipTo!);

      expect(result.type).toBe(Types.String);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'string'));
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should parse type without prefix', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.AnyType;
      const namespaceMap = {};

      const result = XmlSchemaTypesService.parseTypeOverride('CustomType', namespaceMap, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName).toEqual(new QName(null, 'CustomType'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should handle schema with extension types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': extensionComplexXsd },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      const baseResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(baseResult.type).toBe(Types.Container);
      expect(baseResult.typeQName).toEqual(new QName('http://www.example.com/TEST', 'BaseRequest'));
    });

    it('should handle schema with restriction types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'restriction.xsd': restrictionComplexXsd },
      );
      const restrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(restrictionResult.validationStatus).toBe('success');
      const doc = restrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/RESTRICT', xs: NS_XML_SCHEMA };

      const addressField = doc.fields.find((f) => f.name === 'Address');
      if (!addressField) throw new Error('Address field not found');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseAddress', namespaceMap, addressField);

      expect(overrideResult.type).toBe(Types.Container);
      expect(overrideResult.typeQName).toEqual(new QName('http://www.example.com/RESTRICT', 'BaseAddress'));
    });

    it('should return FORCE variant when overriding with incompatible type', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const shipTo = doc.fields[0].fields.find((f) => f.name === 'ShipTo');
      if (!shipTo) throw new Error('ShipTo field not found');

      const result = XmlSchemaTypesService.parseTypeOverride('ns0:UnrelatedType', namespaceMap, shipTo);

      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });

    it('should return SAFE variant when re-overriding with compatible extension type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': extensionComplexXsd },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      requestField.originalType = Types.Container;
      requestField.originalTypeQName = new QName('http://www.example.com/TEST', 'Message');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(overrideResult.variant).toBe(TypeOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return SAFE variant when re-overriding with compatible restriction type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'restriction.xsd': restrictionComplexXsd },
      );
      const restrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(restrictionResult.validationStatus).toBe('success');
      const doc = restrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/RESTRICT', xs: NS_XML_SCHEMA };

      const addressField = doc.fields.find((f) => f.name === 'Address');
      if (!addressField) throw new Error('Address field not found');

      addressField.originalType = Types.Container;
      addressField.originalTypeQName = new QName('http://www.example.com/RESTRICT', 'BaseAddress');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:SimpleAddress', namespaceMap, addressField);

      expect(overrideResult.variant).toBe(TypeOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return FORCE variant when re-overriding with incompatible container type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': extensionComplexXsd },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      requestField.originalType = Types.Container;
      requestField.originalTypeQName = new QName('http://www.example.com/TEST', 'UnrelatedType');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(overrideResult.variant).toBe(TypeOverrideVariant.FORCE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return SAFE variant when re-overriding with compatible derived simple type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'simple.xsd': simpleTypeInheritanceXsd },
      );
      const simpleInheritResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(simpleInheritResult.validationStatus).toBe('success');
      const doc = simpleInheritResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/SIMPLEINHERIT', xs: NS_XML_SCHEMA };

      const extendedValueField = doc.fields.find((f) => f.name === 'ExtendedValue');
      if (!extendedValueField) throw new Error('ExtendedValue field not found');

      extendedValueField.originalType = Types.Container;
      extendedValueField.originalTypeQName = new QName('http://www.example.com/SIMPLEINHERIT', 'ExtendedValueType');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride(
        'ns0:ComplexExtendingSimple',
        namespaceMap,
        extendedValueField,
      );

      expect(overrideResult.variant).toBe(TypeOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return SAFE variant when overriding with simple type that restricts base simple type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'simple.xsd': simpleTypeRestrictionXsd },
      );
      const simpleRestrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(simpleRestrictionResult.validationStatus).toBe('success');
      const doc = simpleRestrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/SIMPLETYPE', xs: NS_XML_SCHEMA };

      const ageField = doc.fields.find((f) => f.name === 'Age');
      if (!ageField) throw new Error('Age field not found');

      ageField.originalType = Types.Container;
      ageField.originalTypeQName = new QName('http://www.example.com/SIMPLETYPE', 'BaseInteger');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:AgeType', namespaceMap, ageField);

      expect(overrideResult.variant).toBe(TypeOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });
  });

  describe('mapTypeStringToEnum()', () => {
    it('should map xs:string to String type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'string')).toBe(Types.String);
    });

    it('should map xs:normalizedString to String type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'normalizedString')).toBe(Types.String);
    });

    it('should map xs:int to Integer type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'int')).toBe(Types.Integer);
    });

    it('should map xs:integer to Integer type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'integer')).toBe(Types.Integer);
    });

    it('should map xs:long to Integer type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'long')).toBe(Types.Integer);
    });

    it('should map xs:decimal to Decimal type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'decimal')).toBe(Types.Decimal);
    });

    it('should map xs:double to Double type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'double')).toBe(Types.Double);
    });

    it('should map xs:float to Float type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'float')).toBe(Types.Float);
    });

    it('should map xs:boolean to Boolean type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'boolean')).toBe(Types.Boolean);
    });

    it('should map xs:date to Date type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'date')).toBe(Types.Date);
    });

    it('should map xs:dateTime to DateTime type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'dateTime')).toBe(Types.DateTime);
    });

    it('should map xs:time to Time type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'time')).toBe(Types.Time);
    });

    it('should map xs:duration to Duration type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'duration')).toBe(Types.Duration);
    });

    it('should map xs:dayTimeDuration to DayTimeDuration type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'dayTimeDuration')).toBe(Types.DayTimeDuration);
    });

    it('should map xs:yearMonthDuration to Duration type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'yearMonthDuration')).toBe(Types.Duration);
    });

    it('should map xs:hexBinary to String type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'hexBinary')).toBe(Types.String);
    });

    it('should map xs:base64Binary to String type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'base64Binary')).toBe(Types.String);
    });

    it('should map xs:anyURI to AnyURI type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'anyURI')).toBe(Types.AnyURI);
    });

    it('should map xs:QName to QName type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'QName')).toBe(Types.QName);
    });

    it('should map xs:NOTATION to String type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'NOTATION')).toBe(Types.String);
    });

    it('should map lowercase xs:datetime to DateTime type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'datetime')).toBe(Types.DateTime);
    });

    it('should map lowercase xs:daytimeduration to Duration type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'daytimeduration')).toBe(Types.Duration);
    });

    it('should map lowercase xs:yearmonthduration to Duration type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'yearmonthduration')).toBe(Types.Duration);
    });

    it('should map lowercase xs:anyuri to AnyURI type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'anyuri')).toBe(Types.AnyURI);
    });

    it('should map lowercase xs:qname to QName type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'qname')).toBe(Types.QName);
    });

    it('should map lowercase xs:notation to String type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'notation')).toBe(Types.String);
    });

    it('should map custom namespace type to Container', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum('http://custom.namespace', 'CustomType')).toBe(Types.Container);
    });

    it('should fallback to AnyType for unknown xs type', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'unknownType')).toBe(Types.AnyType);
    });
  });

  describe('getFieldTypeFromName()', () => {
    it('should return String type for "string"', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('string')).toBe(Types.String);
    });

    it('should return Integer type for "integer"', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('integer')).toBe(Types.Integer);
    });

    it('should return Boolean type for "boolean"', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('boolean')).toBe(Types.Boolean);
    });

    it('should return AnyType for null', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName(null)).toBe(Types.AnyType);
    });

    it('should return AnyType for unknown type name', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('unknownType')).toBe(Types.AnyType);
    });
  });

  describe('collectRootElementOptions()', () => {
    it('should distinguish elements with same local name but different namespaces', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'account-ns.xsd': accountNsXsd,
          'account-ns2.xsd': accountNs2Xsd,
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(result.document!.xmlSchemaCollection);

      expect(options.length).toBe(2);
      expect(options).toContainEqual({
        namespaceUri: 'kaoto.datamapper.test',
        name: 'account',
      });
      expect(options).toContainEqual({
        namespaceUri: 'kaoto.datamapper.test.alternate',
        name: 'account',
      });
    });

    it('should handle elements with blank namespace alongside namespaced elements', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'account-lc.xsd': accountLcXsd,
          'account-ns.xsd': accountNsXsd,
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(result.document!.xmlSchemaCollection);

      expect(options.length).toBe(2);
      expect(options).toContainEqual({
        namespaceUri: '',
        name: 'account',
      });
      expect(options).toContainEqual({
        namespaceUri: 'kaoto.datamapper.test',
        name: 'account',
      });
    });

    it('should return all unique root elements from a single schema', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'MultipleElements.xsd': multipleElementsXsd,
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(result.document!.xmlSchemaCollection);

      expect(options.length).toBe(3);
      expect(options).toContainEqual({
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
        name: 'Order',
      });
      expect(options).toContainEqual({
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
        name: 'Invoice',
      });
      expect(options).toContainEqual({
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
        name: 'Shipment',
      });
    });
  });
});
