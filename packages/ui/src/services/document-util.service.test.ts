import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  Types,
} from '../models/datamapper';
import { IField } from '../models/datamapper/document';
import { IChoiceSelection, IFieldTypeOverride } from '../models/datamapper/metadata';
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

  describe('processTypeOverrides()', () => {
    it('should not modify document when no overrides provided', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');

      DocumentUtilService.processTypeOverrides(doc, [], {}, XmlSchemaTypesService.parseTypeOverride);

      expect(orderPerson?.type).toBe(Types.String);
      expect(orderPerson?.typeOverride).toBe(TypeOverrideVariant.NONE);
    });

    it('should apply type override to top-level field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const overrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.type).toBe(Types.Integer);
      expect(orderPerson?.typeOverride).toBe(TypeOverrideVariant.FORCE);
    });

    it('should apply type override to nested field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const overrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

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
          schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

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
          schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'ns0:CustomType',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.SAFE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

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
          schemaPath: '/tns:Root/tns:Person/tns:Name',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

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
          schemaPath: '/tns:Root/tns:Person/tns:Address/tns:City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      const personAfterOverride = doc.fields[0].fields.find((f) => f.name === 'Person');
      expect(personAfterOverride?.namedTypeFragmentRefs).toHaveLength(0);

      const contactField = personAfterOverride?.fields.find((f) => f.name === 'Contact');
      expect(contactField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(contactField?.fields).toHaveLength(0);
    });

    it('should apply type override to a field nested inside a choice member using schema path', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.isChoice = true;
      const emailField = new XmlSchemaField(choiceField, 'email', false);
      const emailAddressField = new XmlSchemaField(emailField, 'emailAddress', false);
      emailAddressField.type = Types.String;
      emailField.fields = [emailAddressField];
      choiceField.fields = [emailField];
      shipOrderField.fields.push(choiceField);

      const overrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:ShipOrder/{choice:0}/email/emailAddress',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      expect(emailAddressField.type).toBe(Types.Integer);
    });

    it('should apply type override to a field through nested choice compositors using schema path', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const shipOrderField = doc.fields[0];
      const outerChoice = new XmlSchemaField(shipOrderField, 'choice', false);
      outerChoice.isChoice = true;
      const innerChoice = new XmlSchemaField(outerChoice, 'choice', false);
      innerChoice.isChoice = true;
      const targetField = new XmlSchemaField(innerChoice, 'targetField', false);
      targetField.type = Types.String;
      innerChoice.fields = [targetField];
      outerChoice.fields = [innerChoice];
      shipOrderField.fields.push(outerChoice);

      const overrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:ShipOrder/{choice:0}/{choice:0}/targetField',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      expect(targetField.type).toBe(Types.Integer);
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
          schemaPath: '/tns:Root/tns:Person/tns:Name',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
        {
          schemaPath: '/tns:Root/tns:Company/tns:CompanyName',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

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

  describe('processTypeOverride()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };

    it('should apply override to field and add it to document definition', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const override: IFieldTypeOverride = {
        schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
        type: 'xs:int',
        originalType: 'xs:string',
        variant: TypeOverrideVariant.FORCE,
      };

      const result = DocumentUtilService.processTypeOverride(
        doc,
        override,
        namespaceMap,
        XmlSchemaTypesService.parseTypeOverride,
      );

      expect(result).toBe(true);
      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.type).toBe(Types.Integer);
      expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
      expect(doc.definition.fieldTypeOverrides![0]).toEqual(override);
    });

    it('should return false when field is not found', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const override: IFieldTypeOverride = {
        schemaPath: '/ns0:ShipOrder/ns0:NonExistent',
        type: 'xs:int',
        originalType: 'xs:string',
        variant: TypeOverrideVariant.FORCE,
      };

      const result = DocumentUtilService.processTypeOverride(
        doc,
        override,
        namespaceMap,
        XmlSchemaTypesService.parseTypeOverride,
      );

      expect(result).toBe(false);
      expect(doc.definition.fieldTypeOverrides).toBeUndefined();
    });

    it('should update an existing override with the same schemaPath', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const first: IFieldTypeOverride = {
        schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
        type: 'xs:int',
        originalType: 'xs:string',
        variant: TypeOverrideVariant.FORCE,
      };
      DocumentUtilService.processTypeOverride(doc, first, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      const second: IFieldTypeOverride = {
        schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
        type: 'xs:boolean',
        originalType: 'xs:string',
        variant: TypeOverrideVariant.FORCE,
      };
      DocumentUtilService.processTypeOverride(doc, second, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
      expect(doc.definition.fieldTypeOverrides![0].type).toBe('xs:boolean');
    });
  });

  describe('removeTypeOverride()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };

    it('should restore the original field type, remove override from definition, and return true', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const override: IFieldTypeOverride = {
        schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
        type: 'xs:int',
        originalType: 'xs:string',
        variant: TypeOverrideVariant.FORCE,
      };
      DocumentUtilService.processTypeOverride(doc, override, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

      const result = DocumentUtilService.removeTypeOverride(doc, '/ns0:ShipOrder/ns0:OrderPerson', namespaceMap);

      expect(result).toBe(true);
      const orderPerson = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      expect(orderPerson?.typeOverride).toBe(TypeOverrideVariant.NONE);
      expect(doc.definition.fieldTypeOverrides).toHaveLength(0);
    });

    it('should return false when override does not exist for the given path', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = DocumentUtilService.removeTypeOverride(doc, '/ns0:ShipOrder/ns0:OrderPerson', namespaceMap);

      expect(result).toBe(false);
    });

    it('should return false when fieldTypeOverrides is undefined', () => {
      const doc = TestUtil.createSourceOrderDoc();
      delete doc.definition.fieldTypeOverrides;

      const result = DocumentUtilService.removeTypeOverride(doc, '/ns0:ShipOrder/ns0:OrderPerson', namespaceMap);

      expect(result).toBe(false);
    });
  });

  describe('processOverrides()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };

    it('should apply type overrides and choice selections in depth order', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.isChoice = true;
      const memberEmail = new XmlSchemaField(choiceField, 'email', false);
      const emailAddressField = new XmlSchemaField(memberEmail, 'emailAddress', false);
      emailAddressField.type = Types.String;
      memberEmail.fields = [emailAddressField];
      const memberPhone = new XmlSchemaField(choiceField, 'phone', false);
      choiceField.fields = [memberEmail, memberPhone];
      shipOrderField.fields.push(choiceField);

      const typeOverrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:ShipOrder/{choice:0}/email/emailAddress',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];
      const choiceSelections: IChoiceSelection[] = [
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 },
      ];

      DocumentUtilService.processOverrides(
        doc,
        typeOverrides,
        choiceSelections,
        namespaceMap,
        XmlSchemaTypesService.parseTypeOverride,
      );

      expect(choiceField.selectedMemberIndex).toBe(0);
      expect(emailAddressField.type).toBe(Types.Integer);
    });

    it('should apply type overrides before choice selections at same depth', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap2 = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.isChoice = true;
      choiceField.fields = [
        new XmlSchemaField(choiceField, 'optA', false),
        new XmlSchemaField(choiceField, 'optB', false),
      ];
      shipOrderField.fields.push(choiceField);

      const typeOverrides: IFieldTypeOverride[] = [
        {
          schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];
      const choiceSelections: IChoiceSelection[] = [
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 1 },
      ];

      const typeSpy = jest.spyOn(DocumentUtilService, 'processTypeOverride');
      const choiceSpy = jest.spyOn(DocumentUtilService, 'processChoiceSelection');

      DocumentUtilService.processOverrides(
        doc,
        typeOverrides,
        choiceSelections,
        namespaceMap2,
        XmlSchemaTypesService.parseTypeOverride,
      );

      expect(typeSpy).toHaveBeenCalled();
      expect(choiceSpy).toHaveBeenCalled();
      expect(typeSpy.mock.invocationCallOrder[0]).toBeLessThan(choiceSpy.mock.invocationCallOrder[0]);

      typeSpy.mockRestore();
      choiceSpy.mockRestore();
    });

    it('should handle empty arrays without errors', () => {
      const doc = TestUtil.createSourceOrderDoc();

      expect(() => {
        DocumentUtilService.processOverrides(doc, [], [], namespaceMap, XmlSchemaTypesService.parseTypeOverride);
      }).not.toThrow();
    });
  });

  describe('invalidateDescendants()', () => {
    it('should remove type overrides that are descendants of the given path', () => {
      const doc = TestUtil.createSourceOrderDoc();
      doc.definition.fieldTypeOverrides = [
        {
          schemaPath: '/ns0:ShipOrder/ns0:OrderPerson',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.invalidateDescendants(doc, '/ns0:ShipOrder/ShipTo');

      expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
      expect(doc.definition.fieldTypeOverrides[0].schemaPath).toBe('/ns0:ShipOrder/ns0:OrderPerson');
    });

    it('should remove choice selections that are descendants of the given path', () => {
      const doc = TestUtil.createSourceOrderDoc();
      doc.definition.choiceSelections = [
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 },
        { schemaPath: '/ns0:ShipOrder/{choice:0}/email/{choice:0}', selectedMemberIndex: 1 },
      ];

      DocumentUtilService.invalidateDescendants(doc, '/ns0:ShipOrder/{choice:0}/email');

      expect(doc.definition.choiceSelections).toHaveLength(1);
      expect(doc.definition.choiceSelections[0].schemaPath).toBe('/ns0:ShipOrder/{choice:0}');
    });

    it('should preserve the entry at the exact schemaPath', () => {
      const doc = TestUtil.createSourceOrderDoc();
      doc.definition.fieldTypeOverrides = [
        {
          schemaPath: '/ns0:ShipOrder/ShipTo',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:boolean',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.invalidateDescendants(doc, '/ns0:ShipOrder/ShipTo');

      expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
      expect(doc.definition.fieldTypeOverrides[0].schemaPath).toBe('/ns0:ShipOrder/ShipTo');
    });

    it('should handle undefined fieldTypeOverrides and choiceSelections without errors', () => {
      const doc = TestUtil.createSourceOrderDoc();
      delete doc.definition.fieldTypeOverrides;
      delete doc.definition.choiceSelections;

      expect(() => {
        DocumentUtilService.invalidateDescendants(doc, '/ns0:ShipOrder');
      }).not.toThrow();
    });
  });

  describe('processChoiceSelections()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

    function addChoiceFieldToShipOrder(doc: ReturnType<typeof TestUtil.createSourceOrderDoc>) {
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.isChoice = true;
      const memberEmail = new XmlSchemaField(choiceField, 'email', false);
      const memberPhone = new XmlSchemaField(choiceField, 'phone', false);
      choiceField.fields = [memberEmail, memberPhone];
      shipOrderField.fields.push(choiceField);
      return choiceField;
    }

    it('should do nothing when selections array is empty', () => {
      const doc = TestUtil.createSourceOrderDoc();
      addChoiceFieldToShipOrder(doc);

      DocumentUtilService.processChoiceSelections(doc, [], namespaceMap);

      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should apply multiple choice selections', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choice0 = new XmlSchemaField(shipOrderField, 'choice', false);
      choice0.isChoice = true;
      choice0.fields = [new XmlSchemaField(choice0, 'email', false), new XmlSchemaField(choice0, 'phone', false)];
      const choice1 = new XmlSchemaField(shipOrderField, 'choice', false);
      choice1.isChoice = true;
      choice1.fields = [new XmlSchemaField(choice1, 'fax', false), new XmlSchemaField(choice1, 'mobile', false)];
      shipOrderField.fields.push(choice0, choice1);

      const selections: IChoiceSelection[] = [
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 },
        { schemaPath: '/ns0:ShipOrder/{choice:1}', selectedMemberIndex: 1 },
      ];

      DocumentUtilService.processChoiceSelections(doc, selections, namespaceMap);

      expect(choice0.selectedMemberIndex).toBe(0);
      expect(choice1.selectedMemberIndex).toBe(1);
    });
  });

  describe('processChoiceSelection()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

    function makeChoiceField(parent: XmlSchemaField, memberNames: string[]) {
      const choiceField = new XmlSchemaField(parent, 'choice', false);
      choiceField.isChoice = true;
      choiceField.fields = memberNames.map((n) => new XmlSchemaField(choiceField, n, false));
      return choiceField;
    }

    it('should apply selection to a choice field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const selection: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 1 };
      const result = DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(result).toBe(true);
      expect(choiceField.selectedMemberIndex).toBe(1);
    });

    it('should update document.definition.choiceSelections', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const selection: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 };
      DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(doc.definition.choiceSelections).toHaveLength(1);
      expect(doc.definition.choiceSelections![0]).toEqual(selection);
    });

    it('should overwrite existing selection with same schemaPath', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const first: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 };
      DocumentUtilService.processChoiceSelection(doc, first, namespaceMap);

      const second: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 1 };
      DocumentUtilService.processChoiceSelection(doc, second, namespaceMap);

      expect(doc.definition.choiceSelections).toHaveLength(1);
      expect(doc.definition.choiceSelections![0].selectedMemberIndex).toBe(1);
      expect(choiceField.selectedMemberIndex).toBe(1);
    });

    it('should handle nested choice (element inside choice member)', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const outerChoice = makeChoiceField(shipOrderField, []);
      const memberOption = new XmlSchemaField(outerChoice, 'ShipTo', false);
      const innerChoice = makeChoiceField(memberOption, ['cityOnly', 'fullAddress']);
      memberOption.fields = [innerChoice];
      outerChoice.fields = [memberOption];
      shipOrderField.fields.push(outerChoice);

      const selection: IChoiceSelection = {
        schemaPath: '/ns0:ShipOrder/{choice:0}/ShipTo/{choice:0}',
        selectedMemberIndex: 1,
      };
      DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(innerChoice.selectedMemberIndex).toBe(1);
    });

    it('should handle directly nested choices (choice member is itself a choice)', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const outerChoice = makeChoiceField(shipOrderField, []);
      const innerChoice = makeChoiceField(outerChoice, ['optA', 'optB']);
      outerChoice.fields = [innerChoice];
      shipOrderField.fields.push(outerChoice);

      const selection: IChoiceSelection = {
        schemaPath: '/ns0:ShipOrder/{choice:0}/{choice:0}',
        selectedMemberIndex: 0,
      };
      DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(innerChoice.selectedMemberIndex).toBe(0);
    });

    it('should return false for invalid schemaPath (field not found)', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const selection: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/{choice:99}', selectedMemberIndex: 0 };
      const result = DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(result).toBe(false);
      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should return false for out-of-bounds index', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      const selection: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 99 };
      const result = DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(result).toBe(false);
      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should return false for path that resolves to non-choice field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const selection: IChoiceSelection = { schemaPath: '/ns0:ShipOrder/ns0:OrderPerson', selectedMemberIndex: 0 };
      const result = DocumentUtilService.processChoiceSelection(doc, selection, namespaceMap);

      expect(result).toBe(false);
      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should handle two sibling choices independently', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choice0 = makeChoiceField(shipOrderField, ['optA', 'optB']);
      const choice1 = makeChoiceField(shipOrderField, ['optX', 'optY']);
      shipOrderField.fields.push(choice0, choice1);

      DocumentUtilService.processChoiceSelection(
        doc,
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 },
        namespaceMap,
      );
      DocumentUtilService.processChoiceSelection(
        doc,
        { schemaPath: '/ns0:ShipOrder/{choice:1}', selectedMemberIndex: 1 },
        namespaceMap,
      );

      expect(choice0.selectedMemberIndex).toBe(0);
      expect(choice1.selectedMemberIndex).toBe(1);
      expect(doc.definition.choiceSelections).toHaveLength(2);
    });

    it('should correctly index choices when non-choice fields are interspersed', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const elementA = new XmlSchemaField(shipOrderField, 'ElementA', false);
      const choice0 = makeChoiceField(shipOrderField, ['optA', 'optB']);
      const elementB = new XmlSchemaField(shipOrderField, 'ElementB', false);
      const choice1 = makeChoiceField(shipOrderField, ['optX', 'optY']);
      shipOrderField.fields.push(elementA, choice0, elementB, choice1);

      DocumentUtilService.processChoiceSelection(
        doc,
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 0 },
        namespaceMap,
      );
      DocumentUtilService.processChoiceSelection(
        doc,
        { schemaPath: '/ns0:ShipOrder/{choice:1}', selectedMemberIndex: 1 },
        namespaceMap,
      );

      expect(choice0.selectedMemberIndex).toBe(0);
      expect(choice1.selectedMemberIndex).toBe(1);
    });
  });

  describe('removeChoiceSelection()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

    it('should remove selection from document.definition, clear selectedMemberIndex, and return true', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.isChoice = true;
      choiceField.fields = [
        new XmlSchemaField(choiceField, 'email', false),
        new XmlSchemaField(choiceField, 'phone', false),
      ];
      shipOrderField.fields.push(choiceField);

      DocumentUtilService.processChoiceSelection(
        doc,
        { schemaPath: '/ns0:ShipOrder/{choice:0}', selectedMemberIndex: 1 },
        namespaceMap,
      );
      expect(choiceField.selectedMemberIndex).toBe(1);
      expect(doc.definition.choiceSelections).toHaveLength(1);

      const result = DocumentUtilService.removeChoiceSelection(doc, '/ns0:ShipOrder/{choice:0}', namespaceMap);

      expect(result).toBe(true);
      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(doc.definition.choiceSelections).toHaveLength(0);
    });

    it('should return false when schemaPath does not exist in selections', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const result = DocumentUtilService.removeChoiceSelection(doc, '/ns0:ShipOrder/{choice:99}', namespaceMap);

      expect(result).toBe(false);
      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should return false when choiceSelections is undefined', () => {
      const doc = TestUtil.createSourceOrderDoc();
      delete doc.definition.choiceSelections;

      const result = DocumentUtilService.removeChoiceSelection(doc, '/ns0:ShipOrder/{choice:0}', namespaceMap);

      expect(result).toBe(false);
    });
  });

  describe('formatChoiceDisplayName()', () => {
    it('should format with member names', () => {
      expect(DocumentUtilService.formatChoiceDisplayName([{ name: 'email' }, { name: 'phone' }] as IField[])).toEqual(
        'choice (email | phone)',
      );
    });

    it('should return "choice (empty)" when members array is empty', () => {
      expect(DocumentUtilService.formatChoiceDisplayName([])).toEqual('choice (empty)');
    });

    it('should return "choice (empty)" when members is undefined', () => {
      expect(DocumentUtilService.formatChoiceDisplayName()).toEqual('choice (empty)');
    });

    it('should truncate long member lists', () => {
      const longMembers = Array.from({ length: 20 }, (_, i) => ({ name: `VeryLongMemberName${i}` })) as IField[];
      const result = DocumentUtilService.formatChoiceDisplayName(longMembers);
      expect(result).toContain('...');
      expect(result).toMatch(/^choice \(.+\.\.\.\)$/);
    });
  });
});
