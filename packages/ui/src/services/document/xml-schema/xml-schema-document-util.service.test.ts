import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../models/datamapper';
import { BaseDocument } from '../../../models/datamapper/document';
import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant, Types } from '../../../models/datamapper/types';
import {
  getAccountLcXsd,
  getAccountNs2Xsd,
  getAccountNsXsd,
  getCircularIncludeAXsd,
  getCircularIncludeBXsd,
  getCommonTypesXsd,
  getExtensionComplexXsd,
  getIncludeOnlyEntryXsd,
  getMainWithIncludeXsd,
  getMultipleElementsXsd,
  getRestrictionComplexXsd,
  getRootDeclaredXsd,
  getSimpleTypeInheritanceXsd,
  getSimpleTypeRestrictionXsd,
  TestUtil,
} from '../../../stubs/datamapper/data-mapper';
import { QName } from '../../../xml-schema-ts/QName';
import { XmlSchemaCollection } from '../../../xml-schema-ts/XmlSchemaCollection';
import { XmlSchemaAnalysisService } from './xml-schema-analysis.service';
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
          { name: 'OrderPerson', namespaceURI: '' },
          { name: 'ShipTo', namespaceURI: '' },
        ],
      } as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'OrderPerson', '');

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
        fields: [{ name: 'ShipTo', namespaceURI: '' }],
      } as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'NonExistentField', '');

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
          { name: 'RegularField', namespaceURI: '', fields: [] },
          {
            name: 'ContactChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [
              { name: 'email', namespaceURI: '', fields: [] },
              { name: 'phone', namespaceURI: '', fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email', '');

      expect(result).toBeDefined();
      expect(result?.name).toBe('email');
    });

    it('should find field with namespace inside choice member', () => {
      const mockParent = {
        fields: [
          {
            name: 'ContactChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
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
          { name: 'email', namespaceURI: '', fields: [] },
          {
            name: 'ContactChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [{ name: 'email', namespaceURI: 'http://different.com', fields: [] }],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email', '');

      expect(result?.namespaceURI).toBe('');
    });

    it('should find field in nested choice', () => {
      const mockParent = {
        fields: [
          {
            name: 'OuterChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [
              {
                name: 'InnerChoice',
                namespaceURI: '',
                wrapperKind: 'choice',
                fields: [{ name: 'deepField', namespaceURI: '', fields: [] }],
              },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'deepField', '');

      expect(result).toBeDefined();
      expect(result?.name).toBe('deepField');
    });

    it('should return undefined when field not found in choice or regular fields', () => {
      const mockParent = {
        fields: [
          { name: 'RegularField', namespaceURI: '', fields: [] },
          {
            name: 'ContactChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [
              { name: 'email', namespaceURI: '', fields: [] },
              { name: 'phone', namespaceURI: '', fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'nonexistent', '');

      expect(result).toBeUndefined();
    });

    it('should handle empty choice', () => {
      const mockParent = {
        fields: [
          { name: 'RegularField', namespaceURI: '', fields: [] },
          {
            name: 'EmptyChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [],
          },
        ],
      } as unknown as BaseDocument;

      const result = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email', '');

      expect(result).toBeUndefined();
    });

    it('should handle multiple choices in same parent', () => {
      const mockParent = {
        fields: [
          {
            name: 'ContactChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [
              { name: 'email', namespaceURI: '', fields: [] },
              { name: 'phone', namespaceURI: '', fields: [] },
            ],
          },
          {
            name: 'AddressChoice',
            namespaceURI: '',
            wrapperKind: 'choice',
            fields: [
              { name: 'street', namespaceURI: '', fields: [] },
              { name: 'city', namespaceURI: '', fields: [] },
            ],
          },
        ],
      } as unknown as BaseDocument;

      const emailResult = XmlSchemaDocumentUtilService.getChildField(mockParent, 'email', '');
      expect(emailResult).toBeDefined();
      expect(emailResult?.name).toBe('email');

      const streetResult = XmlSchemaDocumentUtilService.getChildField(mockParent, 'street', '');
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
      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should parse xs:int type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:int', namespaceMap, field);

      expect(result.type).toBe(Types.Integer);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'int'));
      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should parse xs:boolean type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:boolean', namespaceMap, field);

      expect(result.type).toBe(Types.Boolean);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'boolean'));
      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should parse xs:date type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:date', namespaceMap, field);

      expect(result.type).toBe(Types.Date);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'date'));
      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should parse xs:decimal type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields[0];
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:decimal', namespaceMap, field);

      expect(result.type).toBe(Types.Decimal);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'decimal'));
      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should parse custom type override with FORCE variant', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipTo = doc.fields[0].fields.find((f) => f.name === 'ShipTo');
      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'http://www.kaoto.io/order' };

      const result = XmlSchemaTypesService.parseTypeOverride('xs:string', namespaceMap, shipTo!);

      expect(result.type).toBe(Types.String);
      expect(result.typeQName).toEqual(new QName(NS_XML_SCHEMA, 'string'));
      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should parse type without prefix', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.AnyType;
      const namespaceMap = {};

      const result = XmlSchemaTypesService.parseTypeOverride('CustomType', namespaceMap, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName).toEqual(new QName(null, 'CustomType'));
      expect(result.variant).toBe(FieldOverrideVariant.SAFE);
    });

    it('should handle schema with extension types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': getExtensionComplexXsd() },
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
        { 'restriction.xsd': getRestrictionComplexXsd() },
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

      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should return SAFE variant when re-overriding with compatible extension type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': getExtensionComplexXsd() },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      requestField.type = Types.Container;
      requestField.typeQName = new QName('http://www.example.com/TEST', 'Message');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should use originalField type/typeQName over field state when determining SAFE extension variant', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': getExtensionComplexXsd() },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      requestField.type = Types.String;
      requestField.originalField = {
        name: requestField.name,
        displayName: requestField.displayName,
        namespaceURI: requestField.namespaceURI,
        namespacePrefix: requestField.namespacePrefix,
        type: Types.Container,
        typeQName: new QName('http://www.example.com/TEST', 'Message'),
        namedTypeFragmentRefs: [],
      };

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return SAFE variant when re-overriding with compatible restriction type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'restriction.xsd': getRestrictionComplexXsd() },
      );
      const restrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(restrictionResult.validationStatus).toBe('success');
      const doc = restrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/RESTRICT', xs: NS_XML_SCHEMA };

      const addressField = doc.fields.find((f) => f.name === 'Address');
      if (!addressField) throw new Error('Address field not found');

      addressField.type = Types.Container;
      addressField.typeQName = new QName('http://www.example.com/RESTRICT', 'BaseAddress');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:SimpleAddress', namespaceMap, addressField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should use originalField type/typeQName over field state when determining SAFE restriction variant', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'restriction.xsd': getRestrictionComplexXsd() },
      );
      const restrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(restrictionResult.validationStatus).toBe('success');
      const doc = restrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/RESTRICT', xs: NS_XML_SCHEMA };

      const addressField = doc.fields.find((f) => f.name === 'Address');
      if (!addressField) throw new Error('Address field not found');

      addressField.type = Types.String;
      addressField.originalField = {
        name: addressField.name,
        displayName: addressField.displayName,
        namespaceURI: addressField.namespaceURI,
        namespacePrefix: addressField.namespacePrefix,
        type: Types.Container,
        typeQName: new QName('http://www.example.com/RESTRICT', 'BaseAddress'),
        namedTypeFragmentRefs: [],
      };

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:SimpleAddress', namespaceMap, addressField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return FORCE variant when re-overriding with incompatible container type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': getExtensionComplexXsd() },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      requestField.type = Types.Container;
      requestField.typeQName = new QName('http://www.example.com/TEST', 'UnrelatedType');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.FORCE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should use originalField type/typeQName over field state when determining FORCE incompatible variant', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extension.xsd': getExtensionComplexXsd() },
      );
      const extensionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(extensionResult.validationStatus).toBe('success');
      const doc = extensionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const requestField = doc.fields.find((f) => f.name === 'Request');
      if (!requestField) throw new Error('Request field not found');

      requestField.type = Types.String;
      requestField.originalField = {
        name: requestField.name,
        displayName: requestField.displayName,
        namespaceURI: requestField.namespaceURI,
        namespacePrefix: requestField.namespacePrefix,
        type: Types.Container,
        typeQName: new QName('http://www.example.com/TEST', 'UnrelatedType'),
        namedTypeFragmentRefs: [],
      };

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:BaseRequest', namespaceMap, requestField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.FORCE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return SAFE variant when re-overriding with compatible derived simple type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'simple.xsd': getSimpleTypeInheritanceXsd() },
      );
      const simpleInheritResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(simpleInheritResult.validationStatus).toBe('success');
      const doc = simpleInheritResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/SIMPLEINHERIT', xs: NS_XML_SCHEMA };

      const extendedValueField = doc.fields.find((f) => f.name === 'ExtendedValue');
      if (!extendedValueField) throw new Error('ExtendedValue field not found');

      extendedValueField.type = Types.Container;
      extendedValueField.typeQName = new QName('http://www.example.com/SIMPLEINHERIT', 'ExtendedValueType');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride(
        'ns0:ComplexExtendingSimple',
        namespaceMap,
        extendedValueField,
      );

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should use originalField type/typeQName over field state when determining SAFE derived simple type variant', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'simple.xsd': getSimpleTypeInheritanceXsd() },
      );
      const simpleInheritResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(simpleInheritResult.validationStatus).toBe('success');
      const doc = simpleInheritResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/SIMPLEINHERIT', xs: NS_XML_SCHEMA };

      const extendedValueField = doc.fields.find((f) => f.name === 'ExtendedValue');
      if (!extendedValueField) throw new Error('ExtendedValue field not found');

      extendedValueField.type = Types.String;
      extendedValueField.originalField = {
        name: extendedValueField.name,
        displayName: extendedValueField.displayName,
        namespaceURI: extendedValueField.namespaceURI,
        namespacePrefix: extendedValueField.namespacePrefix,
        type: Types.Container,
        typeQName: new QName('http://www.example.com/SIMPLEINHERIT', 'ExtendedValueType'),
        namedTypeFragmentRefs: [],
      };

      const overrideResult = XmlSchemaTypesService.parseTypeOverride(
        'ns0:ComplexExtendingSimple',
        namespaceMap,
        extendedValueField,
      );

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should return SAFE variant when overriding with simple type that restricts base simple type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'simple.xsd': getSimpleTypeRestrictionXsd() },
      );
      const simpleRestrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(simpleRestrictionResult.validationStatus).toBe('success');
      const doc = simpleRestrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/SIMPLETYPE', xs: NS_XML_SCHEMA };

      const ageField = doc.fields.find((f) => f.name === 'Age');
      if (!ageField) throw new Error('Age field not found');

      ageField.type = Types.Container;
      ageField.typeQName = new QName('http://www.example.com/SIMPLETYPE', 'BaseInteger');

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:AgeType', namespaceMap, ageField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
      expect(overrideResult.type).toBe(Types.Container);
    });

    it('should use originalField type/typeQName over field state when determining SAFE simple restriction variant', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'simple.xsd': getSimpleTypeRestrictionXsd() },
      );
      const simpleRestrictionResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(simpleRestrictionResult.validationStatus).toBe('success');
      const doc = simpleRestrictionResult.document!;
      const namespaceMap = { ns0: 'http://www.example.com/SIMPLETYPE', xs: NS_XML_SCHEMA };

      const ageField = doc.fields.find((f) => f.name === 'Age');
      if (!ageField) throw new Error('Age field not found');

      ageField.type = Types.String;
      ageField.originalField = {
        name: ageField.name,
        displayName: ageField.displayName,
        namespaceURI: ageField.namespaceURI,
        namespacePrefix: ageField.namespacePrefix,
        type: Types.Container,
        typeQName: new QName('http://www.example.com/SIMPLETYPE', 'BaseInteger'),
        namedTypeFragmentRefs: [],
      };

      const overrideResult = XmlSchemaTypesService.parseTypeOverride('ns0:AgeType', namespaceMap, ageField);

      expect(overrideResult.variant).toBe(FieldOverrideVariant.SAFE);
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

    it.each([
      ['gYear', Types.Date],
      ['gYearMonth', Types.Date],
      ['gMonth', Types.Date],
      ['gMonthDay', Types.Date],
      ['gDay', Types.Date],
      ['anySimpleType', Types.AnyAtomicType],
    ])('should map supported xs:%s without falling back to AnyType', (name, expected) => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, name)).toBe(expected);
    });
  });

  describe('getFieldTypeFromName()', () => {
    it.each([
      ['int', Types.Integer],
      ['long', Types.Integer],
      ['short', Types.Integer],
      ['byte', Types.Integer],
      ['unsignedInt', Types.Integer],
      ['unsignedLong', Types.Integer],
      ['unsignedShort', Types.Integer],
      ['unsignedByte', Types.Integer],
      ['nonPositiveInteger', Types.Integer],
      ['negativeInteger', Types.Integer],
      ['nonNegativeInteger', Types.Integer],
      ['normalizedString', Types.String],
      ['token', Types.String],
      ['language', Types.String],
      ['NMTOKEN', Types.String],
      ['NMTOKENS', Types.String],
      ['Name', Types.String],
      ['ID', Types.String],
      ['IDREF', Types.String],
      ['IDREFS', Types.String],
      ['ENTITY', Types.String],
      ['ENTITIES', Types.String],
      ['hexBinary', Types.String],
      ['base64Binary', Types.String],
    ])('should use the canonical XSD mapping for %s', (name, expected) => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName(name, NS_XML_SCHEMA)).toBe(expected);
    });

    it('should return String type for "string"', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('string', NS_XML_SCHEMA)).toBe(Types.String);
    });

    it('should return Integer type for "integer"', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('integer', NS_XML_SCHEMA)).toBe(Types.Integer);
    });

    it('should return Boolean type for "boolean"', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('boolean', NS_XML_SCHEMA)).toBe(Types.Boolean);
    });

    it('should return AnyType for null', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName(null, NS_XML_SCHEMA)).toBe(Types.AnyType);
    });

    it('should return AnyType for unknown type name', () => {
      expect(XmlSchemaDocumentUtilService.getFieldTypeFromName('unknownType', NS_XML_SCHEMA)).toBe(Types.AnyType);
    });
  });

  describe('collectRootElementOptions()', () => {
    it('should distinguish elements with same local name but different namespaces', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'account-ns.xsd': getAccountNsXsd(),
          'account-ns2.xsd': getAccountNs2Xsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        XmlSchemaAnalysisService.analyze(definition.definitionFiles!).edges,
      );

      expect(options).toHaveLength(2);
      expect(options).toContainEqual({
        namespaceUri: 'kaoto.datamapper.test',
        name: 'account',
        entrySchemaFile: 'account-ns.xsd',
      });
      expect(options).toContainEqual({
        namespaceUri: 'kaoto.datamapper.test.alternate',
        name: 'account',
        entrySchemaFile: 'account-ns2.xsd',
      });
    });

    it('should handle elements with blank namespace alongside namespaced elements', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'account-lc.xsd': getAccountLcXsd(),
          'account-ns.xsd': getAccountNsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        XmlSchemaAnalysisService.analyze(definition.definitionFiles!).edges,
      );

      expect(options).toHaveLength(2);
      expect(options).toContainEqual({
        namespaceUri: '',
        name: 'account',
        entrySchemaFile: 'account-lc.xsd',
      });
      expect(options).toContainEqual({
        namespaceUri: 'kaoto.datamapper.test',
        name: 'account',
        entrySchemaFile: 'account-ns.xsd',
      });
    });

    it('should return all unique root elements from a single schema', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'MultipleElements.xsd': getMultipleElementsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        XmlSchemaAnalysisService.analyze(definition.definitionFiles!).edges,
      );

      expect(options).toHaveLength(3);
      expect(options).toContainEqual({
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
        name: 'Order',
        entrySchemaFile: 'MultipleElements.xsd',
      });
      expect(options).toContainEqual({
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
        name: 'Invoice',
        entrySchemaFile: 'MultipleElements.xsd',
      });
      expect(options).toContainEqual({
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
        name: 'Shipment',
        entrySchemaFile: 'MultipleElements.xsd',
      });
    });

    it('should distinguish same-QName elements from separate unrelated entry schemas', () => {
      const sameQNameXsd1 = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/orders">
  <xs:element name="Order" type="xs:string"/>
</xs:schema>`;
      const sameQNameXsd2 = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/orders">
  <xs:element name="Order" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'FirstOrder.xsd': sameQNameXsd1,
          'SecondOrder.xsd': sameQNameXsd2,
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('warning');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        XmlSchemaAnalysisService.analyze(definition.definitionFiles!).edges,
      );

      expect(options).toHaveLength(2);
      expect(options).toContainEqual({
        namespaceUri: 'http://example.com/orders',
        name: 'Order',
        entrySchemaFile: 'FirstOrder.xsd',
      });
      expect(options).toContainEqual({
        namespaceUri: 'http://example.com/orders',
        name: 'Order',
        entrySchemaFile: 'SecondOrder.xsd',
      });
    });
  });

  describe('collectRootElementOptions() with include/import hierarchy', () => {
    const analyzeEdges = (files: Record<string, string>) => XmlSchemaAnalysisService.analyze(files).edges;

    it('should attribute included elements to the unreferenced entry schema and expose declaringFile', () => {
      const files = {
        'MainWithInclude.xsd': getMainWithIncludeXsd(),
        'CommonTypes.xsd': getCommonTypesXsd(),
        'account-lc.xsd': getAccountLcXsd(),
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        analyzeEdges(files),
      );

      expect(options).toContainEqual({ namespaceUri: '', name: 'Main', entrySchemaFile: 'MainWithInclude.xsd' });
      expect(options).toContainEqual({ namespaceUri: '', name: 'account', entrySchemaFile: 'account-lc.xsd' });
      expect(options.some((o) => o.entrySchemaFile === 'CommonTypes.xsd')).toBe(false);
    });

    it('should expose declaringFile when the element is declared in an included file', () => {
      const files = {
        'IncludeOnlyEntry.xsd': getIncludeOnlyEntryXsd(),
        'RootDeclared.xsd': getRootDeclaredXsd(),
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        analyzeEdges(files),
      );

      expect(options).toEqual([
        {
          namespaceUri: '',
          name: 'Correct',
          entrySchemaFile: 'IncludeOnlyEntry.xsd',
          declaringFile: 'RootDeclared.xsd',
        },
      ]);
    });

    it('should only offer a chameleon include under the namespace of the entry that includes it', () => {
      const files = {
        'A.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:a" xmlns="urn:a">
  <xs:include schemaLocation="Cham.xsd"/>
  <xs:element name="RootA" type="xs:string"/>
</xs:schema>`,
        'B.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:b" xmlns="urn:b">
  <xs:include schemaLocation="Cham.xsd"/>
  <xs:element name="RootB" type="xs:string"/>
</xs:schema>`,
        'Cham.xsd': `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Shared" type="xs:string"/>
</xs:schema>`,
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        analyzeEdges(files),
      );

      const shared = options.filter((o) => o.name === 'Shared');
      expect(shared).toHaveLength(2);
      expect(shared).toContainEqual({
        namespaceUri: 'urn:a',
        name: 'Shared',
        entrySchemaFile: 'A.xsd',
        declaringFile: 'Cham.xsd',
      });
      expect(shared).toContainEqual({
        namespaceUri: 'urn:b',
        name: 'Shared',
        entrySchemaFile: 'B.xsd',
        declaringFile: 'Cham.xsd',
      });
    });

    it('should fall back to treating every schema as its own entry for circular includes', () => {
      const files = {
        'CircularIncludeA.xsd': getCircularIncludeAXsd(),
        'CircularIncludeB.xsd': getCircularIncludeBXsd(),
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.document).toBeDefined();

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        analyzeEdges(files),
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some((o) => o.name === 'Root')).toBe(true);
    });

    it('should still list an isolated include cycle when another unreferenced schema exists', () => {
      const files = {
        'account-lc.xsd': getAccountLcXsd(),
        'CircularIncludeA.xsd': getCircularIncludeAXsd(),
        'CircularIncludeB.xsd': getCircularIncludeBXsd(),
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.document).toBeDefined();

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        result.document!.xmlSchemaCollection,
        analyzeEdges(files),
      );

      expect(options.some((o) => o.name === 'account' && o.entrySchemaFile === 'account-lc.xsd')).toBe(true);
      expect(options.some((o) => o.name === 'Root')).toBe(true);
    });
  });

  describe('determineRootElement() with include-only entry', () => {
    it('should pick the first element from a file reachable via include, not from an unrelated file', () => {
      const files = {
        'account-lc.xsd': getAccountLcXsd(),
        'IncludeOnlyEntry.xsd': getIncludeOnlyEntryXsd(),
        'RootDeclared.xsd': getRootDeclaredXsd(),
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
        undefined,
        undefined,
        undefined,
        undefined,
        'IncludeOnlyEntry.xsd',
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);

      expect(result.validationStatus).toBe('success');
      expect(result.document!.rootElement!.getName()).toBe('Correct');
    });

    it('should infer the unreferenced schema as entrySchemaFile when none is provided', () => {
      // CommonTypes.xsd is attached first but is included by MainWithInclude.xsd, so Main is the assembly root.
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'CommonTypes.xsd': getCommonTypesXsd(),
          'MainWithInclude.xsd': getMainWithIncludeXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);

      expect(result.validationStatus).toBe('success');
      expect(result.documentDefinition!.entrySchemaFile).toBe('MainWithInclude.xsd');
      expect(result.document!.rootElement!.getName()).toBe('Main');
    });
  });

  describe('entry schema inference and persistence round-trip', () => {
    const mainXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ns" xmlns="http://example.com/ns">
  <xs:include schemaLocation="Common.xsd"/>
  <xs:element name="Root" type="xs:string"/>
</xs:schema>`;
    const commonXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ns" xmlns="http://example.com/ns">
  <xs:element name="LibraryRoot" type="xs:string"/>
</xs:schema>`;
    const ns = 'http://example.com/ns';

    const createDefinition = (
      files: Record<string, string>,
      rootElementChoice?: { namespaceUri: string; name: string; entrySchemaFile?: string },
      entrySchemaFile?: string,
    ) =>
      new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
        rootElementChoice,
        undefined,
        undefined,
        undefined,
        entrySchemaFile,
      );

    /** Simulates save + reload: only the persisted fields survive, the rest is re-inferred. */
    const reload = (files: Record<string, string>, saved: DocumentDefinition) =>
      XmlSchemaDocumentService.createXmlSchemaDocument(
        createDefinition(files, saved.rootElementChoice, saved.entrySchemaFile),
      );

    it('should infer the unreferenced schema as the entry regardless of attach order (Main + Common)', () => {
      const attachCommonFirst = XmlSchemaDocumentService.createXmlSchemaDocument(
        createDefinition({ 'Common.xsd': commonXsd, 'Main.xsd': mainXsd }),
      );
      const attachMainFirst = XmlSchemaDocumentService.createXmlSchemaDocument(
        createDefinition({ 'Main.xsd': mainXsd, 'Common.xsd': commonXsd }),
      );

      expect(attachCommonFirst.documentDefinition!.entrySchemaFile).toBe('Main.xsd');
      expect(attachMainFirst.documentDefinition!.entrySchemaFile).toBe('Main.xsd');
    });

    it('should keep the same root and entry after reload when the root is declared in the entry file', () => {
      const files = { 'Main.xsd': mainXsd, 'Common.xsd': commonXsd };
      const attached = XmlSchemaDocumentService.createXmlSchemaDocument(
        createDefinition(files, { namespaceUri: ns, name: 'Root' }),
      );
      expect(attached.document!.rootElement!.getName()).toBe('Root');

      const reloaded = reload(files, attached.documentDefinition!);

      expect(reloaded.document!.rootElement!.getName()).toBe('Root');
      expect(reloaded.documentDefinition!.entrySchemaFile).toBe(attached.documentDefinition!.entrySchemaFile);
    });

    it('should keep the including entry and the chosen root after reload when the root is declared in an included file', () => {
      const files = { 'Common.xsd': commonXsd, 'Main.xsd': mainXsd };
      const attached = XmlSchemaDocumentService.createXmlSchemaDocument(
        createDefinition(files, { namespaceUri: ns, name: 'LibraryRoot' }),
      );
      expect(attached.documentDefinition!.entrySchemaFile).toBe('Main.xsd');
      expect(attached.document!.rootElement!.getName()).toBe('LibraryRoot');

      const reloaded = reload(files, attached.documentDefinition!);

      expect(reloaded.documentDefinition!.entrySchemaFile).toBe('Main.xsd');
      expect(reloaded.document!.rootElement!.getName()).toBe('LibraryRoot');
    });

    it('should keep root and entry after reload for an entry that only includes the root declaring file', () => {
      const files = { 'RootDeclared.xsd': getRootDeclaredXsd(), 'IncludeOnlyEntry.xsd': getIncludeOnlyEntryXsd() };
      const attached = XmlSchemaDocumentService.createXmlSchemaDocument(
        createDefinition(files, { namespaceUri: '', name: 'Correct' }),
      );
      expect(attached.documentDefinition!.entrySchemaFile).toBe('IncludeOnlyEntry.xsd');

      const reloaded = reload(files, attached.documentDefinition!);

      expect(reloaded.documentDefinition!.entrySchemaFile).toBe('IncludeOnlyEntry.xsd');
      expect(reloaded.document!.rootElement!.getName()).toBe('Correct');
    });

    it('should keep the including entry when updateRootElement selects an element declared in an included file', () => {
      const files = { 'Main.xsd': mainXsd, 'Common.xsd': commonXsd };
      const attached = XmlSchemaDocumentService.createXmlSchemaDocument(createDefinition(files));
      expect(attached.document!.rootElement!.getName()).toBe('Root');

      const options = XmlSchemaDocumentUtilService.collectRootElementOptions(
        attached.document!.xmlSchemaCollection,
        XmlSchemaAnalysisService.analyze(files).edges,
      );
      const libraryRoot = options.find((o) => o.name === 'LibraryRoot')!;
      expect(libraryRoot.entrySchemaFile).toBe('Main.xsd');
      expect(libraryRoot.declaringFile).toBe('Common.xsd');

      const updated = XmlSchemaDocumentService.updateRootElement(attached.document!, libraryRoot);

      expect(updated.rootElement!.getName()).toBe('LibraryRoot');
      expect(updated.definition.entrySchemaFile).toBe('Main.xsd');
      expect(updated.definition.rootElementChoice).toEqual(libraryRoot);
    });
  });

  describe('inferEntrySchemaFile()', () => {
    it('should return undefined when definitionFiles is empty', () => {
      const collection = new XmlSchemaCollection();
      expect(XmlSchemaDocumentUtilService.inferEntrySchemaFile(collection, {}, [])).toBeUndefined();
    });

    it('should return the candidate reaching rootElementChoice', () => {
      const collection = new XmlSchemaCollection();
      const files = {
        'Types.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/types"><xs:complexType name="T"/></xs:schema>',
        'Main.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/main"><xs:element name="Root" type="xs:string"/></xs:schema>',
      };
      XmlSchemaDocumentUtilService.loadXmlSchemaFiles(collection, files);

      const entry = XmlSchemaDocumentUtilService.inferEntrySchemaFile(collection, files, [], {
        namespaceUri: 'http://example.com/main',
        name: 'Root',
      });

      expect(entry).toBe('Main.xsd');
    });

    it('should pick candidate with elements over types-only candidate when no rootElementChoice is provided (split entry fix)', () => {
      const collection = new XmlSchemaCollection();
      const files = {
        'Types.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/types"><xs:complexType name="T"/></xs:schema>',
        'Main.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/main"><xs:element name="Root" type="xs:string"/></xs:schema>',
      };
      XmlSchemaDocumentUtilService.loadXmlSchemaFiles(collection, files);

      // Types.xsd is attached first and both are unreferenced, but Types.xsd has 0 elements.
      const entry = XmlSchemaDocumentUtilService.inferEntrySchemaFile(collection, files, []);

      expect(entry).toBe('Main.xsd');
    });

    it('should infer candidate that reaches elements only through an import', () => {
      const collection = new XmlSchemaCollection();
      const files = {
        'EmptyUnreferenced.xsd': '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>',
        'EntryImporting.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/entry"><xs:import namespace="http://example.com/types" schemaLocation="TypesWithElem.xsd"/></xs:schema>',
        'TypesWithElem.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/types"><xs:element name="ImportedElem" type="xs:string"/></xs:schema>',
      };
      collection.getSchemaResolver().addFiles(files);
      XmlSchemaDocumentUtilService.loadXmlSchemaFiles(collection, files);
      const edges = XmlSchemaAnalysisService.analyze(files).edges;

      const entry = XmlSchemaDocumentUtilService.inferEntrySchemaFile(collection, files, edges);

      expect(entry).toBe('EntryImporting.xsd');
    });

    it('should respect effective namespace when resolving first element from a chameleon schema included by multiple hosts', () => {
      const collection = new XmlSchemaCollection();
      const files = {
        'HostB.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:ns-b"><xs:include schemaLocation="Cham.xsd"/></xs:schema>',
        'HostA.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:ns-a"><xs:include schemaLocation="Cham.xsd"/></xs:schema>',
        'Cham.xsd':
          '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="SharedItem" type="xs:string"/></xs:schema>',
      };
      collection.getSchemaResolver().addFiles(files);
      // Load HostB first so its chameleon instance (urn:ns-b) is first in collection.getUserSchemas()
      XmlSchemaDocumentUtilService.loadXmlSchemaFiles(collection, files);
      const edges = XmlSchemaAnalysisService.analyze(files).edges;

      // In HostA (urn:ns-a), determineRootElement must find SharedItem under urn:ns-a, not urn:ns-b
      const rootElemA = XmlSchemaDocumentUtilService.determineRootElement(collection, undefined, 'HostA.xsd', edges);
      expect(rootElemA.getQName()?.getNamespaceURI()).toBe('urn:ns-a');
      expect(rootElemA.getName()).toBe('SharedItem');
    });

    it('should handle circular include graphs using findUnreferencedSchemas', () => {
      const files = {
        'CircularIncludeA.xsd': getCircularIncludeAXsd(),
        'CircularIncludeB.xsd': getCircularIncludeBXsd(),
      };
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        files,
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('warning');
      expect(result.documentDefinition?.entrySchemaFile).toBe('CircularIncludeA.xsd');
    });
  });
});
