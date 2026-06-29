import {
  DocumentDefinitionType,
  FieldItem,
  MappingTree,
  NS_XSL,
  PrimitiveDocument,
  Types,
} from '../../models/datamapper';
import { BODY_DOCUMENT_ID, DocumentDefinition, DocumentType } from '../../models/datamapper/document';
import { NS_XPATH_FUNCTIONS } from '../../models/datamapper/standard-namespaces';
import { getCartToShipOrderJsonXslt, getShipOrderXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import {
  FROM_JSON_SOURCE_SUFFIX,
  JsonSchemaDocument,
  JsonSchemaField,
} from '../document/json-schema/json-schema-document.model';
import { XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { MappingSerializerJsonAddon, TO_JSON_TARGET_VARIABLE } from './mapping-serializer-json-addon';

describe('mappingSerializerJsonAddon', () => {
  describe('populateXmlToJsonVariable()', () => {
    it('should populate a variable', () => {
      const xsltDocument = MappingSerializerService.createNew();
      const stylesheet = xsltDocument.children[0];
      const template = xsltDocument.createElementNS(NS_XSL, 'template');
      template.setAttribute('match', '/');
      stylesheet.appendChild(template);

      const mappings = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(
        getCartToShipOrderJsonXslt(),
        TestUtil.createTargetOrderDoc(),
        mappings,
        TestUtil.createParameterMap(),
      );
      MappingSerializerJsonAddon.populateJsonTargetBase(mappings, template);

      expect(template.children).toHaveLength(1);
      const valueOf = template.children[0];
      expect(valueOf.namespaceURI).toEqual(NS_XSL);
      expect(valueOf.localName).toBe('value-of');
      expect(valueOf.getAttribute('select')).toBe(`xml-to-json($${TO_JSON_TARGET_VARIABLE})`);

      expect(stylesheet.children).toHaveLength(3);
      const output = stylesheet.children[0];
      expect(output.getAttribute('method')).toBe('text');

      const variable = stylesheet.children[1];
      expect(variable.namespaceURI).toEqual(NS_XSL);
      expect(variable.localName).toBe('variable');
      expect(variable.getAttribute('name')).toEqual(TO_JSON_TARGET_VARIABLE);
    });

    it('should not populate a variable if not JSON target', () => {
      const xsltDocument = MappingSerializerService.createNew();
      const stylesheet = xsltDocument.children[0];
      const template = xsltDocument.createElementNS(NS_XSL, 'template');
      template.setAttribute('match', '/');
      stylesheet.appendChild(template);

      const mappings = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.XML_SCHEMA);
      const root = MappingSerializerJsonAddon.populateJsonTargetBase(mappings, template);

      expect(root).toBeNull();
      expect(template.children).toHaveLength(0);

      expect(stylesheet.children).toHaveLength(2);
      const output = stylesheet.children[0];
      expect(output.getAttribute('method')).toBe('xml');
    });

    it('should not populate a variable in JSON target case when no mappings', () => {
      const xsltDocument = MappingSerializerService.createNew();
      const stylesheet = xsltDocument.children[0];
      const template = xsltDocument.createElementNS(NS_XSL, 'template');
      template.setAttribute('match', '/');
      stylesheet.appendChild(template);

      const mappings = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.JSON_SCHEMA);
      const root = MappingSerializerJsonAddon.populateJsonTargetBase(mappings, template);

      expect(root).toBeNull();
      expect(template.children).toHaveLength(0);

      expect(stylesheet.children).toHaveLength(2);
      const output = stylesheet.children[0];
      expect(output.getAttribute('method')).toBe('xml');
    });
  });

  describe('populateJsonToXmlVariable', () => {
    it('should populate a variable', () => {
      const xsltDocument = MappingSerializerService.createNew();
      const stylesheet = xsltDocument.children[0];
      const paramName = 'testParam';
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, paramName),
      );
      MappingSerializerJsonAddon.populateJsonToXmlVariable(doc, stylesheet, paramName);

      expect(stylesheet.children).toHaveLength(2);
      const variable = stylesheet.children[1];
      expect(variable.getAttribute('name')).toEqual(paramName + FROM_JSON_SOURCE_SUFFIX);
      expect(variable.getAttribute('select')).toBe(`json-to-xml($${paramName})`);
    });

    it('should not populate a variable if not JSON param', () => {
      const xsltDocument = MappingSerializerService.createNew();
      const stylesheet = xsltDocument.children[0];
      const paramName = 'testParam';
      const doc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, paramName),
      );
      MappingSerializerJsonAddon.populateJsonToXmlVariable(doc, stylesheet, paramName);
      expect(stylesheet.children).toHaveLength(1);
    });
  });

  describe('populateFieldItem()', () => {
    const xsltDocument = MappingSerializerService.createNew();
    const stylesheet = xsltDocument.children[0];
    const template = xsltDocument.createElementNS(NS_XSL, 'template');
    template.setAttribute('match', '/');
    stylesheet.appendChild(template);

    it('should populate a FieldItem', () => {
      const mappings = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.JSON_SCHEMA);
      MappingSerializerService.deserialize(
        getCartToShipOrderJsonXslt(),
        TestUtil.createTargetOrderDoc(),
        mappings,
        TestUtil.createParameterMap(),
      );
      const root = MappingSerializerJsonAddon.populateJsonTargetBase(mappings, template);
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body'),
      );

      let mapField = new JsonSchemaField(doc, '', Types.Container);
      let fieldItem = new FieldItem(mappings, mapField);
      let created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('map');
      expect(created!.getAttribute('key')).toBeNull();

      mapField = new JsonSchemaField(doc, 'SomeParent', Types.Container);
      fieldItem = new FieldItem(mappings, mapField);
      created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('map');
      expect(created!.getAttribute('key')).toBe('SomeParent');

      const arrayField = new JsonSchemaField(doc, 'SomeArray', Types.Array);
      fieldItem = new FieldItem(mappings, arrayField);
      created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('array');
      expect(created!.getAttribute('key')).toBe('SomeArray');

      const stringField = new JsonSchemaField(doc, 'SomeString', Types.String);
      fieldItem = new FieldItem(mappings, stringField);
      created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('string');
      expect(created!.getAttribute('key')).toBe('SomeString');

      const numberField = new JsonSchemaField(doc, 'SomeNumber', Types.Numeric);
      fieldItem = new FieldItem(mappings, numberField);
      created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('number');
      expect(created!.getAttribute('key')).toBe('SomeNumber');

      const booleanField = new JsonSchemaField(doc, 'SomeBoolean', Types.Boolean);
      fieldItem = new FieldItem(mappings, booleanField);
      created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('boolean');
      expect(created!.getAttribute('key')).toBe('SomeBoolean');

      const integerField = new JsonSchemaField(doc, 'SomeInteger', Types.Integer);
      fieldItem = new FieldItem(mappings, integerField);
      created = MappingSerializerJsonAddon.populateFieldItem(root!, fieldItem);
      expect(created!.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(created!.localName).toBe('number');
      expect(created!.getAttribute('key')).toBe('SomeInteger');
    });

    it('should not populate a FieldItem if not JSON field', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd() },
      );
      const doc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      const mappings = new MappingTree(DocumentType.TARGET_BODY, 'Body', DocumentDefinitionType.XML_SCHEMA);
      const field = new XmlSchemaField(doc, '', false);
      const fieldItem = new FieldItem(mappings, field);

      const created = MappingSerializerJsonAddon.populateFieldItem(template, fieldItem);
      expect(created).toBeNull();
    });
  });

  describe('getOrCreateJsonField()', () => {
    it('should create a JsonSchemaField', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body'),
      );
      const mapElement = document.createElementNS(NS_XPATH_FUNCTIONS, 'map');
      const mapField = MappingSerializerJsonAddon.getOrCreateJsonField(mapElement, doc);
      expect(mapField instanceof JsonSchemaField).toBeTruthy();
      let mapJsonField = mapField as JsonSchemaField;
      expect(mapJsonField.key).toBe('');
      expect(mapJsonField.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(mapJsonField.type).toEqual(Types.Container);
      mapElement.setAttribute('key', 'SomeMap');
      mapJsonField = MappingSerializerJsonAddon.getOrCreateJsonField(mapElement, doc) as JsonSchemaField;
      expect(mapJsonField.key).toBe('SomeMap');

      const arrayElement = document.createElementNS(NS_XPATH_FUNCTIONS, 'array');
      arrayElement.setAttribute('key', 'SomeArray');
      const arrayField = MappingSerializerJsonAddon.getOrCreateJsonField(arrayElement, doc);
      expect(arrayField instanceof JsonSchemaField).toBeTruthy();
      const arrayJsonField = arrayField as JsonSchemaField;
      expect(arrayJsonField.key).toBe('SomeArray');
      expect(arrayJsonField.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(arrayJsonField.type).toEqual(Types.Array);

      const stringElement = document.createElementNS(NS_XPATH_FUNCTIONS, 'string');
      stringElement.setAttribute('key', 'SomeString');
      const stringField = MappingSerializerJsonAddon.getOrCreateJsonField(stringElement, doc);
      expect(stringField instanceof JsonSchemaField).toBeTruthy();
      const stringJsonField = stringField as JsonSchemaField;
      expect(stringJsonField.key).toBe('SomeString');
      expect(stringJsonField.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(stringJsonField.type).toEqual(Types.String);

      const numberElement = document.createElementNS(NS_XPATH_FUNCTIONS, 'number');
      numberElement.setAttribute('key', 'SomeNumber');
      const numberField = MappingSerializerJsonAddon.getOrCreateJsonField(numberElement, doc);
      expect(numberField instanceof JsonSchemaField).toBeTruthy();
      const numberJsonField = numberField as JsonSchemaField;
      expect(numberJsonField.key).toBe('SomeNumber');
      expect(numberJsonField.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(numberJsonField.type).toEqual(Types.Numeric);

      const booleanElement = document.createElementNS(NS_XPATH_FUNCTIONS, 'boolean');
      booleanElement.setAttribute('key', 'SomeBoolean');
      const booleanField = MappingSerializerJsonAddon.getOrCreateJsonField(booleanElement, doc);
      expect(booleanField instanceof JsonSchemaField).toBeTruthy();
      const booleanJsonField = booleanField as JsonSchemaField;
      expect(booleanJsonField.key).toBe('SomeBoolean');
      expect(booleanJsonField.namespaceURI).toEqual(NS_XPATH_FUNCTIONS);
      expect(booleanJsonField.type).toEqual(Types.Boolean);
    });

    it('should not create a field if not lossless element', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body'),
      );
      const testElement = document.createElementNS('test', 'Test');
      const testField = MappingSerializerJsonAddon.getOrCreateJsonField(testElement, doc);
      expect(testField).toBeNull();
    });
  });
});
