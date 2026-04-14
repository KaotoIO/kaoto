import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../models/datamapper/document';
import { IFieldSubstitution } from '../models/datamapper/metadata';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../models/datamapper/types';
import {
  getCommonTypesXsd,
  getElementRefXsd,
  getFieldSubstitutionXsd,
  getImportedTypesXsd,
  getMainWithIncludeXsd,
  getShipOrderXsd,
} from '../stubs/datamapper/data-mapper';
import { QName } from '../xml-schema-ts/QName';
import { ensureNamespaceRegistered } from './namespace-util';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('XmlSchemaDocumentService / schema file management', () => {
  describe('addSchemaFiles', () => {
    it('should add additional schema files to existing document', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Main">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="field1" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'main.xsd': mainSchema,
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;

      const additionalSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/additional">
  <xs:complexType name="AdditionalType">
    <xs:sequence>
      <xs:element name="additionalField" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      XmlSchemaDocumentService.addSchemaFiles(document, {
        'additional.xsd': additionalSchema,
      });

      const additionalQName = new QName('http://example.com/additional', 'AdditionalType');
      const additionalType = document.xmlSchemaCollection.getTypeByQName(additionalQName);
      expect(additionalType).toBeDefined();
    });

    it('should allow schemas with imports to resolve after adding files', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Main" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'main.xsd': mainSchema,
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;

      const schemaWithImport = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/importing"
           xmlns:imported="http://example.com/imported">
  <xs:import namespace="http://example.com/imported" schemaLocation="imported.xsd"/>
  <xs:element name="ImportingElement" type="imported:ImportedType"/>
</xs:schema>`;

      const importedSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/imported">
  <xs:complexType name="ImportedType">
    <xs:sequence>
      <xs:element name="field" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      XmlSchemaDocumentService.addSchemaFiles(document, {
        'importing.xsd': schemaWithImport,
        'imported.xsd': importedSchema,
      });

      const importedQName = new QName('http://example.com/imported', 'ImportedType');
      const importedType = document.xmlSchemaCollection.getTypeByQName(importedQName);
      expect(importedType).toBeDefined();
    });

    it('should make added schemas available in the collection', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/main">
  <xs:element name="Main" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'main.xsd': mainSchema },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;

      const additionalSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/types">
  <xs:complexType name="CustomType">
    <xs:sequence>
      <xs:element name="field" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      XmlSchemaDocumentService.addSchemaFiles(document, { 'types.xsd': additionalSchema });

      const customQName = new QName('http://example.com/types', 'CustomType');
      expect(document.xmlSchemaCollection.getTypeByQName(customQName)).toBeDefined();
    });

    it('should register namespace with sequential prefix (ns0, ns1, ns2, ...)', () => {
      const map1: Record<string, string> = {};
      ensureNamespaceRegistered('http://example.com/test', map1);
      expect(map1['ns0']).toBe('http://example.com/test');

      const map2: Record<string, string> = { ns0: 'http://example.com/test' };
      ensureNamespaceRegistered('http://example.com/other', map2);
      expect(map2['ns1']).toBe('http://example.com/other');

      const map3: Record<string, string> = {
        ns0: 'http://example.com/test',
        ns1: 'http://example.com/test2',
        ns2: 'http://example.com/other',
      };
      ensureNamespaceRegistered('http://example.com/new', map3);
      expect(map3['ns3']).toBe('http://example.com/new');
    });

    it('should be a no-op when namespace is already registered', () => {
      const map = { ns0: 'http://example.com/test' };
      ensureNamespaceRegistered('http://example.com/test', map);
      expect(Object.keys(map)).toHaveLength(1);
    });

    it('should use preferredPrefix when supplied and available', () => {
      const map: Record<string, string> = {};
      ensureNamespaceRegistered('http://example.com/test', map, 'tns');
      expect(map['tns']).toBe('http://example.com/test');
    });

    it('should fall back to sequential prefix when preferredPrefix is taken', () => {
      const map: Record<string, string> = { tns: 'http://example.com/other' };
      ensureNamespaceRegistered('http://example.com/test', map, 'tns');
      expect(map['ns0']).toBe('http://example.com/test');
    });

    it('should support multiple sequential addSchemaFiles() calls', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/main">
  <xs:element name="Main" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'main.xsd': mainSchema },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;

      const schemaA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/types">
  <xs:complexType name="TypeA">
    <xs:sequence>
      <xs:element name="field" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      XmlSchemaDocumentService.addSchemaFiles(document, { 'types.xsd': schemaA });

      const schemaB = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/other">
  <xs:complexType name="TypeB">
    <xs:sequence>
      <xs:element name="other" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      XmlSchemaDocumentService.addSchemaFiles(document, { 'other.xsd': schemaB });

      const typeAQName = new QName('http://example.com/types', 'TypeA');
      const typeBQName = new QName('http://example.com/other', 'TypeB');
      expect(document.xmlSchemaCollection.getTypeByQName(typeAQName)).toBeDefined();
      expect(document.xmlSchemaCollection.getTypeByQName(typeBQName)).toBeDefined();
    });
  });

  describe('dependency validation', () => {
    it('should return actionable error for missing included schema', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="Missing.xsd"/>
  <xs:element name="Main" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'main.xsd': mainSchema },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors![0].message).toContain('Missing required schema');
      expect(result.errors![0].message).toContain('Missing.xsd');
      expect(result.errors![0].message).toContain('main.xsd');
      expect(result.errors![0].message).toContain('xs:include');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return actionable error for missing imported schema', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/main"
           xmlns:types="http://example.com/types">
  <xs:import namespace="http://example.com/types" schemaLocation="types.xsd"/>
  <xs:element name="Root" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'main.xsd': mainSchema },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors![0].message).toContain('Missing required schema');
      expect(result.errors![0].message).toContain('types.xsd');
      expect(result.errors![0].message).toContain('xs:import');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return error for circular includes', () => {
      const schemaA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="B.xsd"/>
  <xs:element name="A" type="xs:string"/>
</xs:schema>`;

      const schemaB = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="A.xsd"/>
  <xs:element name="B" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'A.xsd': schemaA, 'B.xsd': schemaB },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors![0].message).toContain('Circular xs:include');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should warn with circular imports (different namespaces)', () => {
      const schemaA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/a"
           xmlns:b="http://example.com/b">
  <xs:import namespace="http://example.com/b" schemaLocation="B.xsd"/>
  <xs:element name="A" type="xs:string"/>
</xs:schema>`;

      const schemaB = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/b"
           xmlns:a="http://example.com/a">
  <xs:import namespace="http://example.com/a" schemaLocation="A.xsd"/>
  <xs:element name="B" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'A.xsd': schemaA, 'B.xsd': schemaB },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('warning');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].message).toContain('Circular xs:import');
      expect(result.document).toBeDefined();
    });

    it('should load deep dependency chain in correct order', () => {
      const schemaA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="B.xsd"/>
  <xs:element name="Main" type="CommonType"/>
</xs:schema>`;

      const schemaB = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="C.xsd"/>
  <xs:complexType name="MiddleType">
    <xs:sequence>
      <xs:element name="middle" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      const schemaC = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="CommonType">
    <xs:sequence>
      <xs:element name="field1" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'A.xsd': schemaA, 'B.xsd': schemaB, 'C.xsd': schemaC },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();
      expect(document.fields[0].name).toBe('Main');
    });
  });

  describe('removeSchemaFile', () => {
    it('should return error with updated definition when removing a dependency file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'MainWithInclude.xsd': getMainWithIncludeXsd(),
          'CommonTypes.xsd': getCommonTypesXsd(),
        },
      );
      const initialResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(initialResult.validationStatus).not.toBe('error');

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.xsd', {});
      expect(removeResult.validationStatus).toBe('error');
      expect(removeResult.errors).toBeDefined();
      expect(removeResult.errors!.length).toBeGreaterThan(0);
      expect(removeResult.documentDefinition).toBeDefined();
      expect(removeResult.documentDefinition!.definitionFiles!['CommonTypes.xsd']).toBeUndefined();
      expect(removeResult.documentDefinition!.definitionFiles!['MainWithInclude.xsd']).toBeDefined();
    });

    it('should succeed when removing a non-essential schema file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd(), 'ImportedTypes.xsd': getImportedTypesXsd() },
      );

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'ImportedTypes.xsd', {});
      expect(removeResult.validationStatus).toBe('success');
      expect(removeResult.document).toBeDefined();
    });

    it('should return error when removing all schema files', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd() },
      );

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'shipOrder.xsd', {});
      expect(removeResult.validationStatus).toBe('error');
      expect(removeResult.errors).toBeDefined();
    });

    it('should not mutate the original definition', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'MainWithInclude.xsd': getMainWithIncludeXsd(),
          'CommonTypes.xsd': getCommonTypesXsd(),
        },
      );

      XmlSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.xsd', {});
      expect(definition.definitionFiles!['CommonTypes.xsd']).toBeDefined();
    });

    it('should fallback to first element when rootElementChoice is in the removed file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd(), 'element-ref.xsd': getElementRefXsd() },
        { namespaceUri: 'io.kaoto.datamapper.poc.test', name: 'ShipOrder' },
      );

      const initialResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(initialResult.document).toBeDefined();

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'shipOrder.xsd', {});
      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.rootElementChoice).toBeUndefined();
    });

    it('should preserve rootElementChoice when it is not in the removed file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd(), 'element-ref.xsd': getElementRefXsd() },
        { namespaceUri: 'io.kaoto.datamapper.poc.test', name: 'ShipOrder' },
      );

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'element-ref.xsd', {});
      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.rootElementChoice).toEqual({
        namespaceUri: 'io.kaoto.datamapper.poc.test',
        name: 'ShipOrder',
      });
    });

    it('should clear fieldTypeOverrides, choiceSelections and fieldSubstitutions when rootElementChoice file is removed', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd(), 'element-ref.xsd': getElementRefXsd() },
        { namespaceUri: 'io.kaoto.datamapper.poc.test', name: 'ShipOrder' },
      );
      definition.fieldTypeOverrides = [
        { schemaPath: '/old/path', type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.FORCE },
      ];
      definition.choiceSelections = [{ schemaPath: '/old/{choice:0}', selectedMemberIndex: 1 }];
      const substitution: IFieldSubstitution = {
        schemaPath: '/old/path',
        name: 'ns0:newName',
        originalName: 'ns0:oldName',
      };
      definition.fieldSubstitutions = [substitution];

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'shipOrder.xsd', {});

      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toEqual([]);
      expect(removeResult.documentDefinition!.choiceSelections).toEqual([]);
      expect(removeResult.documentDefinition!.fieldSubstitutions).toEqual([]);
    });

    it('should clear metadata when file removal changes the effective root (no rootElementChoice set)', () => {
      const schemaA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/A">
  <xs:element name="RootA" type="xs:string"/>
</xs:schema>`;
      const schemaB = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/B">
  <xs:element name="RootB" type="xs:string"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'A.xsd': schemaA, 'B.xsd': schemaB },
      );
      const initialResult = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(initialResult.document).toBeDefined();
      const initialRootLocal = initialResult.document!.rootElement?.getQName()?.getLocalPart();
      expect(initialRootLocal).toBe('RootA');

      definition.fieldTypeOverrides = [
        {
          schemaPath: '/ns_a:RootA',
          type: 'xs:string',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];
      definition.choiceSelections = [{ schemaPath: '/ns_a:RootA/{choice:0}', selectedMemberIndex: 0 }];
      definition.fieldSubstitutions = [{ schemaPath: '/ns_a:RootA', name: 'ns_a:RootA', originalName: 'ns_a:RootA' }];

      const namespaceMap = { ns_a: 'http://example.com/A' };
      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'A.xsd', namespaceMap);

      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.document!.rootElement?.getQName()?.getLocalPart()).toBe('RootB');
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toEqual([]);
      expect(removeResult.documentDefinition!.choiceSelections).toEqual([]);
      expect(removeResult.documentDefinition!.fieldSubstitutions).toEqual([]);
    });

    it('should preserve metadata when removing a non-essential file with root field substituted', () => {
      const secondarySchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.example.com/SECONDARY">
  <xs:complexType name="Helper_t">
    <xs:sequence>
      <xs:element name="data" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;

      const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd(), 'Secondary.xsd': secondarySchema },
        { namespaceUri: NS_SUBSTITUTION, name: 'AbstractAnimal' },
      );
      definition.fieldSubstitutions = [
        { schemaPath: '/{abstract:0}', name: 'sub:Cat', originalName: 'sub:AbstractAnimal' },
      ];
      definition.fieldTypeOverrides = [
        {
          schemaPath: '/{abstract:0}/sub:Cat/name',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];
      const namespaceMap = { sub: NS_SUBSTITUTION, xs: NS_XML_SCHEMA };

      const removeResult = XmlSchemaDocumentService.removeSchemaFile(definition, 'Secondary.xsd', namespaceMap);

      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.document!.rootElement?.getQName()?.getLocalPart()).toBe('AbstractAnimal');
      expect(removeResult.documentDefinition!.fieldSubstitutions).toHaveLength(1);
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toHaveLength(1);
      const rootField = removeResult.document!.fields[0];
      expect(rootField.wrapperKind).toBe('abstract');
      expect(rootField.name).toBe('AbstractAnimal');
      expect(rootField.fields.length).toBeGreaterThan(0);
      const catField = rootField.fields.find((f) => f.name === 'Cat');
      expect(catField).toBeDefined();
    });
  });
});
