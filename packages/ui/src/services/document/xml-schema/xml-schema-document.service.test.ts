import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../../models/datamapper/document';
import { NS_XML_SCHEMA_INSTANCE } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';
import {
  getAnnotatedFieldsXsd,
  getAnonymousGlobalElementRefLargeXsd,
  getCamelSpringXsd,
  getCommonTypesXsd,
  getElementRefXsd,
  getExtensionComplexXsd,
  getExtensionSimpleXsd,
  getImportedTypesXsd,
  getInlineAttrSimpleTypeXsd,
  getInvalidComplexExtensionXsd,
  getMainWithImportXsd,
  getMainWithIncludeXsd,
  getMultiIncludeComponentAXsd,
  getMultiIncludeComponentBXsd,
  getMultiIncludeMainXsd,
  getMultiLevelExtensionXsd,
  getMultiLevelRestrictionXsd,
  getRestrictionComplexXsd,
  getRestrictionInheritanceXsd,
  getRestrictionSimpleXsd,
  getSchemaTestXsd,
  getShipOrderEmptyFirstLineXsd,
  getShipOrderXsd,
  getSimpleTypeInheritanceXsd,
  getTestDocumentXsd,
} from '../../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';

describe('XmlSchemaDocumentService', () => {
  it('should parse ShipOrder XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.xsd': getShipOrderXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    const shipOrder = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, shipOrder);
    expect(fields.length > 0).toBeTruthy();
    expect(fields[0].name).toBe('ShipOrder');
    expect(fields[0].fields[3].name).toBe('Item');
    const itemTitleField = fields[0].fields[3].fields[0];
    expect(itemTitleField.name).toBe('Title');
    expect(itemTitleField.type).not.toEqual(Types.Container);
  });

  it('should parse TestDocument XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'testDocument.xsd': getTestDocumentXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    const testDoc = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, testDoc);
    expect(fields.length > 0).toBeTruthy();
  });

  it('should create a choice wrapper field for xs:choice', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'testDocument.xsd': getTestDocumentXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    const testDoc = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, testDoc);

    const testDocument = fields[0];
    const choiceElement = testDocument.fields.find((f) => f.name === 'ChoiceElement')!;
    expect(choiceElement).toBeDefined();

    // xs:choice should create a single choice wrapper field
    expect(choiceElement.fields).toHaveLength(1);
    const choiceWrapper = choiceElement.fields[0];
    expect(choiceWrapper.wrapperKind).toBe('choice');
    expect(choiceWrapper.name).toBe('__choice__');
    expect(choiceWrapper.displayName).toBe('choice');

    // Choice1, Choice2, and Group1 (xs:sequence -> Group1Element1, Group1Element2 flattened)
    expect(choiceWrapper.fields).toHaveLength(4);
    expect(choiceWrapper.fields.find((f) => f.name === 'Choice1')).toBeDefined();
    expect(choiceWrapper.fields.find((f) => f.name === 'Choice2')).toBeDefined();
    expect(choiceWrapper.fields.find((f) => f.name === 'Group1Element1')).toBeDefined();
    expect(choiceWrapper.fields.find((f) => f.name === 'Group1Element2')).toBeDefined();
  });

  it('should preserve maxOccurs from xs:choice on the choice wrapper', () => {
    const xsdContent = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Root">
    <xs:complexType>
      <xs:choice maxOccurs="unbounded">
        <xs:element name="OptionA" type="xs:string"/>
        <xs:element name="OptionB" type="xs:string"/>
      </xs:choice>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'root.xsd': xsdContent },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    const root = document.fields[0];
    const choiceWrapper = root.fields.find((f) => f.wrapperKind === 'choice');
    expect(choiceWrapper).toBeDefined();
    expect(choiceWrapper!.maxOccurs).toBe('unbounded');
    expect(choiceWrapper!.maxOccursExplicit).toBe(true);
    expect(choiceWrapper!.fields).toHaveLength(2);
  });

  it('should produce two sibling choice wrappers for two sibling xs:choice compositors', () => {
    const xsdContent = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>
        <xs:choice>
          <xs:element name="A1" type="xs:string"/>
          <xs:element name="A2" type="xs:string"/>
        </xs:choice>
        <xs:choice>
          <xs:element name="B1" type="xs:string"/>
          <xs:element name="B2" type="xs:string"/>
        </xs:choice>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'root.xsd': xsdContent },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    const root = document.fields[0];
    const choiceWrappers = root.fields.filter((f) => f.wrapperKind === 'choice');
    expect(choiceWrappers).toHaveLength(2);
    expect(choiceWrappers[0].fields.find((f) => f.name === 'A1')).toBeDefined();
    expect(choiceWrappers[0].fields.find((f) => f.name === 'A2')).toBeDefined();
    expect(choiceWrappers[1].fields.find((f) => f.name === 'B1')).toBeDefined();
    expect(choiceWrappers[1].fields.find((f) => f.name === 'B2')).toBeDefined();
  });

  it('should parse camel-spring.xsd XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'camel-spring.xsd': getCamelSpringXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);
    const aggregate = document.fields[0];
    expect(aggregate.fields).toHaveLength(0);
    expect(aggregate.namedTypeFragmentRefs).toHaveLength(1);
    expect(aggregate.namedTypeFragmentRefs[0]).toBe('{http://camel.apache.org/schema/spring}aggregateDefinition');
    const aggregateDef = document.namedTypeFragments[aggregate.namedTypeFragmentRefs[0]];

    // Many fields; fewer direct children now that xs:choice compositors are wrapped
    expect(aggregateDef.fields.length).toBeGreaterThanOrEqual(30);

    const outputDef = document.namedTypeFragments['{http://camel.apache.org/schema/spring}output'];
    expect(outputDef).toBeDefined();

    expect(outputDef.fields.length).toBeGreaterThanOrEqual(2);

    const processorDef = document.namedTypeFragments['{http://camel.apache.org/schema/spring}processorDefinition'];
    expect(processorDef).toBeDefined();

    expect(processorDef.fields.length).toBeGreaterThanOrEqual(2);

    const optionalIdentifiedDef =
      document.namedTypeFragments['{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition'];
    expect(optionalIdentifiedDef).toBeDefined();
    expect(optionalIdentifiedDef.fields).toHaveLength(3);
  });

  it('should parse ExtensionSimple.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': getExtensionSimpleXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);
    const product = document.fields[0];
    expect(product.name).toBe('Product');
    expect(product.fields).toHaveLength(2);

    const nameField = product.fields[0];
    expect(nameField.name).toBe('name');
    expect(nameField.namedTypeFragmentRefs).toHaveLength(1);
    const extendedStringRef = nameField.namedTypeFragmentRefs[0];
    const extendedStringType = document.namedTypeFragments[extendedStringRef];
    expect(extendedStringType.fields).toHaveLength(2);
    expect(extendedStringType.fields[0].name).toBe('lang');
    expect(extendedStringType.fields[0].isAttribute).toBeTruthy();
    expect(extendedStringType.fields[1].name).toBe('format');
    expect(extendedStringType.fields[1].isAttribute).toBeTruthy();

    const priceField = product.fields[1];
    expect(priceField.name).toBe('price');
    expect(priceField.namedTypeFragmentRefs).toHaveLength(1);

    const priceTypeRef = priceField.namedTypeFragmentRefs[0];
    expect(priceTypeRef).toBe('{http://www.example.com/SIMPLE}PriceType');
    const priceType = document.namedTypeFragments[priceTypeRef];
    expect(priceType.fields).toHaveLength(3);
    expect(priceType.fields[0].name).toBe('currency');
    expect(priceType.fields[0].isAttribute).toBeTruthy();
    expect(priceType.fields[1].name).toBe('taxIncluded');
    expect(priceType.fields[1].isAttribute).toBeTruthy();
    expect(priceType.fields[2].name).toBe('discount');
    expect(priceType.fields[2].isAttribute).toBeTruthy();
    expect(priceType.namedTypeFragmentRefs).toHaveLength(0);

    const basePrice = document.namedTypeFragments['{http://www.example.com/SIMPLE}BasePrice'];
    expect(basePrice).toBeDefined();
    expect(basePrice.fields).toHaveLength(2);
    expect(basePrice.fields[0].name).toBe('currency');
    expect(basePrice.fields[0].namedTypeFragmentRefs).toHaveLength(1);

    const currencyTypeRef = basePrice.fields[0].namedTypeFragmentRefs[0];
    expect(currencyTypeRef).toBe('{http://www.example.com/SIMPLE}CurrencyType');
    const currencyType = document.namedTypeFragments[currencyTypeRef];
    expect(currencyType.type).toEqual(Types.Decimal);

    expect(basePrice.fields[0].isAttribute).toBeTruthy();
    expect(basePrice.fields[1].name).toBe('taxIncluded');
    expect(basePrice.fields[1].isAttribute).toBeTruthy();
  });

  it('should parse ExtensionComplex.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'extensionComplex.xsd': getExtensionComplexXsd() },
      { namespaceUri: 'http://www.example.com/TEST', name: 'Request' },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);
    const request = document.fields[0];
    expect(request.name).toBe('Request');

    expect(request.fields).toHaveLength(3);
    expect(request.fields[0].name).toBe('timestamp'); // from Message
    expect(request.fields[1].name).toBe('user'); // from BaseRequest
    expect(request.fields[2].name).toBe('name'); // from Request

    const baseRequestFragment = document.namedTypeFragments['{http://www.example.com/TEST}BaseRequest'];
    expect(baseRequestFragment).toBeDefined();
    expect(baseRequestFragment.fields).toHaveLength(2);
    expect(baseRequestFragment.fields[0].name).toBe('timestamp'); // from Message
    expect(baseRequestFragment.fields[1].name).toBe('user'); // from BaseRequest

    const messageFragment = document.namedTypeFragments['{http://www.example.com/TEST}Message'];
    expect(messageFragment).toBeDefined();
    expect(messageFragment.fields).toHaveLength(1);
    expect(messageFragment.fields[0].name).toBe('timestamp');
  });

  it('should create XML schema document with routes as a root element', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'camel-spring.xsd': getCamelSpringXsd() },
      { namespaceUri: 'http://camel.apache.org/schema/spring', name: 'routes' },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);
    const routes = document.fields[0];
    expect(routes.fields).toHaveLength(0);

    const routesRef = routes.namedTypeFragmentRefs[0];
    const routeDef = document.namedTypeFragments[routesRef];
    expect(routeDef.fields.length).toBeGreaterThanOrEqual(1);
    const route = routeDef.fields.find((f) => f.name === 'route');
    expect(route).toBeDefined();

    const baseTypeDef =
      document.namedTypeFragments['{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition'];
    expect(baseTypeDef).toBeDefined();
    expect(baseTypeDef.fields).toHaveLength(3);
  });

  it('should create XML Schema Document', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.xsd': getShipOrderXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const doc = result.document as XmlSchemaDocument;
    expect(doc.documentType).toEqual(DocumentType.SOURCE_BODY);
    expect(doc.documentId).toBe('Body');
    expect(doc.name).toBe('Body');
    expect(doc.fields).toHaveLength(1);
  });

  it('should throw an error if there is a parse error on the XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      'ShipOrderEmptyFirstLine',
      { 'ShipOrderEmptyFirstLine.xsd': getShipOrderEmptyFirstLineXsd() },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('error');
    expect(result.errors![0].message).toContain('an XML declaration must be at the start of the document');
  });

  it('should parse SchemaTest.xsd with advanced features', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'schemaTest.xsd': getSchemaTestXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);

    const root = document.fields[0];
    expect(root.name).toBe('Root');
    expect(root.fields).toHaveLength(2);

    const person = root.fields[0];
    expect(person.name).toBe('person');
    expect(person.namedTypeFragmentRefs).toHaveLength(1);
    expect(person.namedTypeFragmentRefs[0]).toBe('{http://www.example.com/test}PersonType');

    const personType = document.namedTypeFragments[person.namedTypeFragmentRefs[0]];
    expect(personType).toBeDefined();

    // name, street, city from AddressGroup, 1 choice wrapper, createdBy, createdDate, @id, @version, @status
    expect(personType.fields).toHaveLength(9);

    const nameField = personType.fields.find((f) => f.name === 'name');
    expect(nameField).toBeDefined();

    const streetField = personType.fields.find((f) => f.name === 'street');
    expect(streetField).toBeDefined();
    const cityField = personType.fields.find((f) => f.name === 'city');
    expect(cityField).toBeDefined();

    // xs:choice wraps into a choice field; ContactGroup is itself xs:choice -> nested wrapper
    const choiceField = personType.fields.find((f) => f.wrapperKind === 'choice');
    expect(choiceField).toBeDefined();
    expect(choiceField!.wrapperKind).toBe('choice');
    const innerChoiceField = choiceField!.fields.find((f) => f.wrapperKind === 'choice');
    expect(innerChoiceField).toBeDefined();
    const emailField = innerChoiceField!.fields.find((f) => f.name === 'email');
    expect(emailField).toBeDefined();
    const phoneField = innerChoiceField!.fields.find((f) => f.name === 'phone');
    expect(phoneField).toBeDefined();
    const faxField = choiceField!.fields.find((f) => f.name === 'fax');
    expect(faxField).toBeDefined();

    const createdByField = personType.fields.find((f) => f.name === 'createdBy');
    expect(createdByField).toBeDefined();
    const createdDateField = personType.fields.find((f) => f.name === 'createdDate');
    expect(createdDateField).toBeDefined();

    const idAttr = personType.fields.find((f) => f.name === 'id' && f.isAttribute);
    expect(idAttr).toBeDefined();
    expect(idAttr!.minOccurs).toBe(1); // required
    expect(idAttr!.maxOccurs).toBe(1);

    const versionAttr = personType.fields.find((f) => f.name === 'version' && f.isAttribute);
    expect(versionAttr).toBeDefined();
    expect(versionAttr!.minOccurs).toBe(0); // optional
    expect(versionAttr!.maxOccurs).toBe(1);

    const statusAttr = personType.fields.find((f) => f.name === 'status' && f.isAttribute);
    expect(statusAttr).toBeDefined();
    expect(statusAttr!.minOccurs).toBe(0); // prohibited
    expect(statusAttr!.maxOccurs).toBe(0);

    const restricted = root.fields[1];
    expect(restricted.name).toBe('restricted');
    expect(restricted.namedTypeFragmentRefs).toHaveLength(1);

    const restrictedType = document.namedTypeFragments[restricted.namedTypeFragmentRefs[0]];
    expect(restrictedType).toBeDefined();
  });

  it('should handle XmlSchemaField getExpression with namespaceMap', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': getExtensionSimpleXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;

    const product = document.fields[0];
    const priceField = product.fields.find((f) => f.name === 'price');
    expect(priceField).toBeDefined();

    const namespaceMap = { simple: 'http://www.example.com/SIMPLE' };
    const expression = priceField!.getExpression(namespaceMap);
    expect(expression).toBe('simple:price');

    const emptyMap = {};
    const expressionNoNs = priceField!.getExpression(emptyMap);
    expect(expressionNoNs).toBe('price');

    const priceTypeRef = priceField!.namedTypeFragmentRefs[0];
    const priceType = document.namedTypeFragments[priceTypeRef];
    const discountAttr = priceType.fields.find((f) => f.name === 'discount' && f.isAttribute);
    expect(discountAttr).toBeDefined();

    let attrExpression = discountAttr?.getExpression({});
    expect(attrExpression).toBe('@discount');
    attrExpression = discountAttr!.getExpression(namespaceMap);
    expect(attrExpression).toBe('@discount');
  });

  it('should expose xsi:nil as a child field for nillable elements', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'nillable.xsd': `
          <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                     targetNamespace="http://www.example.com/NILLABLE"
                     xmlns:tns="http://www.example.com/NILLABLE"
                     elementFormDefault="qualified">
            <xs:element name="Root" nillable="true">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="Child" type="xs:string" />
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:schema>`,
      },
      { namespaceUri: 'http://www.example.com/NILLABLE', name: 'Root' },
    );

    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    const root = document.fields[0];

    expect(root.nillable).toBe(true);
    expect(root.fields.some((field) => field.isAttribute && field.name === 'nil')).toBe(true);

    const nilField = root.fields.find((field) => field.isAttribute && field.name === 'nil');
    expect(nilField).toBeDefined();
    expect(nilField!.displayName).toBe('xsi:nil');
    expect(nilField!.namespacePrefix).toBe('xsi');
    expect(nilField!.namespaceURI).toEqual(NS_XML_SCHEMA_INSTANCE);
  });

  it('should parse RestrictionSimple.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionSimple.xsd': getRestrictionSimpleXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);

    const priceField = document.fields[0];
    expect(priceField.name).toBe('Price');
    expect(priceField.namedTypeFragmentRefs).toHaveLength(1);

    const euroPriceRef = priceField.namedTypeFragmentRefs[0];
    expect(euroPriceRef).toBe('{http://www.example.com/RESTRICT}EuroPrice');
    const euroPriceType = document.namedTypeFragments[euroPriceRef];
    expect(euroPriceType).toBeDefined();
    expect(euroPriceType.fields).toHaveLength(2);
    expect(euroPriceType.fields[0].name).toBe('currency');
    expect(euroPriceType.fields[0].isAttribute).toBeTruthy();
    expect(euroPriceType.fields[0].minOccurs).toBe(1);
    expect(euroPriceType.fields[0].defaultValue).toBe('EUR');
    expect(euroPriceType.fields[1].name).toBe('taxIncluded');
    expect(euroPriceType.fields[1].isAttribute).toBeTruthy();

    expect(euroPriceType.namedTypeFragmentRefs).toHaveLength(0);

    const basePriceType = document.namedTypeFragments['{http://www.example.com/RESTRICT}BasePrice'];
    expect(basePriceType).toBeDefined();
    expect(basePriceType.fields).toHaveLength(2);
    expect(basePriceType.fields[0].name).toBe('currency');
    expect(basePriceType.fields[0].isAttribute).toBeTruthy();
    expect(basePriceType.fields[1].name).toBe('taxIncluded');
    expect(basePriceType.fields[1].isAttribute).toBeTruthy();
  });

  it('should parse RestrictionComplex.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionComplex.xsd': getRestrictionComplexXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);

    const addressField = document.fields[0];
    expect(addressField.name).toBe('Address');
    expect(addressField.namedTypeFragmentRefs).toHaveLength(1);

    const simpleAddressRef = addressField.namedTypeFragmentRefs[0];
    expect(simpleAddressRef).toBe('{http://www.example.com/RESTRICT}SimpleAddress');
    const simpleAddressType = document.namedTypeFragments[simpleAddressRef];
    expect(simpleAddressType).toBeDefined();
    expect(simpleAddressType.fields).toHaveLength(6);
    expect(simpleAddressType.fields[0].name).toBe('id');
    expect(simpleAddressType.fields[0].isAttribute).toBeTruthy();
    expect(simpleAddressType.fields[0].minOccurs).toBe(1);
    expect(simpleAddressType.fields[1].name).toBe('type');
    expect(simpleAddressType.fields[1].isAttribute).toBeTruthy();
    expect(simpleAddressType.fields[2].name).toBe('street');
    expect(simpleAddressType.fields[2].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[3].name).toBe('city');
    expect(simpleAddressType.fields[3].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[4].name).toBe('zip');
    expect(simpleAddressType.fields[4].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[5].name).toBe('country');
    expect(simpleAddressType.fields[5].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[5].maxOccurs).toBe(0);

    expect(simpleAddressType.namedTypeFragmentRefs).toHaveLength(0);

    const baseAddressType = document.namedTypeFragments['{http://www.example.com/RESTRICT}BaseAddress'];
    expect(baseAddressType).toBeDefined();
    expect(baseAddressType.fields).toHaveLength(6);
    expect(baseAddressType.fields[0].name).toBe('id');
    expect(baseAddressType.fields[0].isAttribute).toBeTruthy();
    expect(baseAddressType.fields[1].name).toBe('type');
    expect(baseAddressType.fields[1].isAttribute).toBeTruthy();
    expect(baseAddressType.fields[2].name).toBe('street');
    expect(baseAddressType.fields[2].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[3].name).toBe('city');
    expect(baseAddressType.fields[3].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[4].name).toBe('zip');
    expect(baseAddressType.fields[4].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[5].name).toBe('country');
    expect(baseAddressType.fields[5].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[5].maxOccurs).toBe(1);
  });

  it('should parse RestrictionInheritance.xsd with nested content models', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionInheritance.xsd': getRestrictionInheritanceXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);

    const dataField = document.fields[0];
    expect(dataField.name).toBe('Data');
    expect(dataField.namedTypeFragmentRefs).toHaveLength(1);

    const restrictedTypeRef = dataField.namedTypeFragmentRefs[0];
    expect(restrictedTypeRef).toBe('{http://www.example.com/INHERIT}RestrictedType');
    const restrictedType = document.namedTypeFragments[restrictedTypeRef];
    expect(restrictedType).toBeDefined();

    expect(restrictedType.fields).toHaveLength(5);
    expect(restrictedType.fields[0].name).toBe('version');
    expect(restrictedType.fields[0].isAttribute).toBeTruthy();
    expect(restrictedType.fields[1].name).toBe('id');
    expect(restrictedType.fields[1].isAttribute).toBeTruthy();
    expect(restrictedType.fields[2].name).toBe('timestamp');
    expect(restrictedType.fields[2].isAttribute).toBeFalsy();
    expect(restrictedType.fields[3].name).toBe('required');
    expect(restrictedType.fields[3].isAttribute).toBeFalsy();
    expect(restrictedType.fields[4].name).toBe('optional');
    expect(restrictedType.fields[4].isAttribute).toBeFalsy();

    const baseType = document.namedTypeFragments['{http://www.example.com/INHERIT}BaseType'];
    expect(baseType).toBeDefined();
    expect(baseType.fields).toHaveLength(5);
    expect(baseType.fields[0].name).toBe('version');
    expect(baseType.fields[0].isAttribute).toBeTruthy();
    expect(baseType.fields[1].name).toBe('id');
    expect(baseType.fields[1].isAttribute).toBeTruthy();
    expect(baseType.fields[2].name).toBe('timestamp');
    expect(baseType.fields[2].isAttribute).toBeFalsy();
    expect(baseType.fields[3].name).toBe('required');
    expect(baseType.fields[3].isAttribute).toBeFalsy();
    expect(baseType.fields[4].name).toBe('optional');
    expect(baseType.fields[4].isAttribute).toBeFalsy();

    const grandparentType = document.namedTypeFragments['{http://www.example.com/INHERIT}GrandparentType'];
    expect(grandparentType).toBeDefined();
    expect(grandparentType.fields).toHaveLength(2);
    expect(grandparentType.fields[0].name).toBe('version');
    expect(grandparentType.fields[0].isAttribute).toBeTruthy();
    expect(grandparentType.fields[1].name).toBe('timestamp');
    expect(grandparentType.fields[1].isAttribute).toBeFalsy();
  });

  it('should handle multi-level extension inheritance', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'multiLevelExtension.xsd': getMultiLevelExtensionXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);

    const dataField = document.fields[0];
    expect(dataField.name).toBe('Data');
    expect(dataField.namedTypeFragmentRefs).toHaveLength(1);

    const childTypeRef = dataField.namedTypeFragmentRefs[0];
    expect(childTypeRef).toBe('{http://www.example.com/MULTI}ChildType');
    const childType = document.namedTypeFragments[childTypeRef];
    expect(childType).toBeDefined();

    expect(childType.fields).toHaveLength(6);
    expect(childType.fields[0].name).toBe('grandparentAttr');
    expect(childType.fields[0].isAttribute).toBeTruthy();
    expect(childType.fields[1].name).toBe('parentAttr');
    expect(childType.fields[1].isAttribute).toBeTruthy();
    expect(childType.fields[2].name).toBe('childAttr');
    expect(childType.fields[2].isAttribute).toBeTruthy();
    expect(childType.fields[3].name).toBe('grandparentField');
    expect(childType.fields[3].isAttribute).toBeFalsy();
    expect(childType.fields[4].name).toBe('parentField');
    expect(childType.fields[4].isAttribute).toBeFalsy();
    expect(childType.fields[5].name).toBe('childField');
    expect(childType.fields[5].isAttribute).toBeFalsy();

    const parentType = document.namedTypeFragments['{http://www.example.com/MULTI}ParentType'];
    expect(parentType).toBeDefined();
    expect(parentType.fields).toHaveLength(4);
    expect(parentType.fields[0].name).toBe('grandparentAttr');
    expect(parentType.fields[1].name).toBe('parentAttr');
    expect(parentType.fields[2].name).toBe('grandparentField');
    expect(parentType.fields[3].name).toBe('parentField');

    const grandparentType = document.namedTypeFragments['{http://www.example.com/MULTI}GrandparentType'];
    expect(grandparentType).toBeDefined();
    expect(grandparentType.fields).toHaveLength(2);
    expect(grandparentType.fields[0].name).toBe('grandparentAttr');
    expect(grandparentType.fields[1].name).toBe('grandparentField');
  });

  it('should handle multi-level restriction inheritance', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'multiLevelRestriction.xsd': getMultiLevelRestrictionXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields).toHaveLength(1);

    const dataField = document.fields[0];
    expect(dataField.name).toBe('Data');
    expect(dataField.namedTypeFragmentRefs).toHaveLength(1);

    const strictEuroPriceRef = dataField.namedTypeFragmentRefs[0];
    expect(strictEuroPriceRef).toBe('{http://www.example.com/MULTIRESTRICT}StrictEuroPrice');
    const strictEuroPriceType = document.namedTypeFragments[strictEuroPriceRef];
    expect(strictEuroPriceType).toBeDefined();

    expect(strictEuroPriceType.fields).toHaveLength(2);
    expect(strictEuroPriceType.fields[0].name).toBe('currency');
    expect(strictEuroPriceType.fields[0].isAttribute).toBeTruthy();
    expect(strictEuroPriceType.fields[0].defaultValue).toBe('EUR');
    expect(strictEuroPriceType.fields[1].name).toBe('taxIncluded');
    expect(strictEuroPriceType.fields[1].isAttribute).toBeTruthy();
    expect(strictEuroPriceType.fields[1].defaultValue).toBe('true');

    const euroPriceType = document.namedTypeFragments['{http://www.example.com/MULTIRESTRICT}EuroPrice'];
    expect(euroPriceType).toBeDefined();
    expect(euroPriceType.fields).toHaveLength(2);
    expect(euroPriceType.fields[0].name).toBe('currency');
    expect(euroPriceType.fields[0].isAttribute).toBeTruthy();
    expect(euroPriceType.fields[0].defaultValue).toBe('EUR');
    expect(euroPriceType.fields[1].name).toBe('taxIncluded');
    expect(euroPriceType.fields[1].isAttribute).toBeTruthy();

    const basePriceType = document.namedTypeFragments['{http://www.example.com/MULTIRESTRICT}BasePrice'];
    expect(basePriceType).toBeDefined();
    expect(basePriceType.fields).toHaveLength(2);
    expect(basePriceType.fields[0].name).toBe('currency');
    expect(basePriceType.fields[0].isAttribute).toBeTruthy();
    expect(basePriceType.fields[1].name).toBe('taxIncluded');
    expect(basePriceType.fields[1].isAttribute).toBeTruthy();
  });

  it('should handle XmlSchemaField isIdentical method correctly', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': getExtensionSimpleXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;

    const product = document.fields[0];
    const priceTypeRef = product.fields[1].namedTypeFragmentRefs[0];
    const priceType = document.namedTypeFragments[priceTypeRef];

    const currencyAttr = priceType.fields[0];
    const taxIncludedAttr = priceType.fields[1];

    expect(currencyAttr.isIdentical(currencyAttr)).toBeTruthy();
    expect(currencyAttr.isIdentical(taxIncludedAttr)).toBeFalsy();

    const mockField = {
      name: 'currency',
      isAttribute: false,
      namespaceURI: currencyAttr.namespaceURI,
    };
    expect(currencyAttr.isIdentical(mockField as unknown as XmlSchemaField)).toBeFalsy();
  });

  it('should merge attributes from base type in restrictions', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionSimple.xsd': getRestrictionSimpleXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();

    const euroPriceRef = '{http://www.example.com/RESTRICT}EuroPrice';
    const euroPriceType = document.namedTypeFragments[euroPriceRef];
    expect(euroPriceType).toBeDefined();

    const currencyAttr = euroPriceType.fields.find((f) => f.name === 'currency' && f.isAttribute);
    expect(currencyAttr).toBeDefined();
    expect(currencyAttr!.defaultValue).toBe('EUR');
    expect(currencyAttr!.minOccurs).toBe(1); // REQUIRED
    expect(currencyAttr!.maxOccurs).toBe(1);

    const taxIncludedAttr = euroPriceType.fields.find((f) => f.name === 'taxIncluded' && f.isAttribute);
    expect(taxIncludedAttr).toBeDefined();
    expect(taxIncludedAttr!.isAttribute).toBeTruthy();
  });

  it('should support getChildField with namespace matching', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': getExtensionSimpleXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;

    const product = document.fields[0];
    const nameField = XmlSchemaDocumentUtilService.getChildField(product, 'name', 'http://www.example.com/SIMPLE');
    expect(nameField).toBeDefined();
    expect(nameField!.name).toBe('name');

    const priceField = XmlSchemaDocumentUtilService.getChildField(product, 'price', 'http://www.example.com/SIMPLE');
    expect(priceField).toBeDefined();
    expect(priceField!.name).toBe('price');

    const nonExistent = XmlSchemaDocumentUtilService.getChildField(
      product,
      'nonexistent',
      'http://www.example.com/SIMPLE',
    );
    expect(nonExistent).toBeUndefined();

    const wrongNamespace = XmlSchemaDocumentUtilService.getChildField(product, 'name', 'http://wrong.namespace');
    expect(wrongNamespace).toBeUndefined();
  });

  it('should handle extension that attempts to redefine base elements', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'invalidComplexExtension.xsd': getInvalidComplexExtensionXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();

    const productField = document.fields[0];
    expect(productField.name).toBe('Product');

    const extendedProductRef = productField.namedTypeFragmentRefs[0];
    expect(extendedProductRef).toBe('{http://www.example.com/CONFLICT}ExtendedProduct');
    const extendedProduct = document.namedTypeFragments[extendedProductRef];
    expect(extendedProduct).toBeDefined();

    const fields = extendedProduct.fields;
    expect(fields).toHaveLength(3);

    expect(fields[0].name).toBe('name');
    expect(fields[0].isAttribute).toBeFalsy();
    expect(fields[0].defaultValue).toBe('Unknown');
    expect(fields[0].minOccurs).toBe(0);
    expect(fields[0].maxOccurs).toBe(1);

    expect(fields[1].name).toBe('price');
    expect(fields[1].isAttribute).toBeFalsy();
    expect(fields[1].minOccurs).toBe(1);
    expect(fields[1].maxOccurs).toBe(1);

    expect(fields[2].name).toBe('description');
    expect(fields[2].isAttribute).toBeFalsy();
    expect(fields[2].minOccurs).toBe(0);

    const baseProduct = document.namedTypeFragments['{http://www.example.com/CONFLICT}BaseProduct'];
    expect(baseProduct).toBeDefined();
    expect(baseProduct.fields).toHaveLength(2);
    expect(baseProduct.fields[0].name).toBe('name');
    expect(baseProduct.fields[0].defaultValue).toBe('Unknown');
    expect(baseProduct.fields[0].minOccurs).toBe(0);
    expect(baseProduct.fields[0].maxOccurs).toBe(1);
    expect(baseProduct.fields[1].name).toBe('price');
    expect(baseProduct.fields[1].minOccurs).toBe(1);
    expect(baseProduct.fields[1].maxOccurs).toBe(1);
  });

  it('should handle simpleType inheritance with extension and restriction', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'simpleTypeInheritance.xsd': getSimpleTypeInheritanceXsd(),
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();

    const baseStringType = document.namedTypeFragments['{http://www.example.com/SIMPLEINHERIT}BaseStringType'];
    expect(baseStringType).toBeDefined();

    const derivedStringType = document.namedTypeFragments['{http://www.example.com/SIMPLEINHERIT}DerivedStringType'];
    expect(derivedStringType).toBeDefined();

    const extendedValueTypeRef = '{http://www.example.com/SIMPLEINHERIT}ExtendedValueType';
    const extendedValueType = document.namedTypeFragments[extendedValueTypeRef];
    expect(extendedValueType).toBeDefined();
    expect(extendedValueType.fields).toHaveLength(2);
    expect(extendedValueType.fields[0].name).toBe('lang');
    expect(extendedValueType.fields[0].isAttribute).toBeTruthy();
    expect(extendedValueType.fields[1].name).toBe('format');
    expect(extendedValueType.fields[1].isAttribute).toBeTruthy();

    const restrictedValueTypeRef = '{http://www.example.com/SIMPLEINHERIT}RestrictedValueType';
    const restrictedValueType = document.namedTypeFragments[restrictedValueTypeRef];
    expect(restrictedValueType).toBeDefined();
    expect(restrictedValueType.fields).toHaveLength(1);
    expect(restrictedValueType.fields[0].name).toBe('lang');
    expect(restrictedValueType.fields[0].isAttribute).toBeTruthy();
    expect(restrictedValueType.fields[0].defaultValue).toBe('en');
  });

  it('should respect root element choice for schemas with element references (issue #2876)', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'element-ref.xsd': getElementRefXsd() },
      { namespaceUri: '', name: 'CSV' },
    );

    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);

    expect(result.validationStatus).toBe('success');
    expect(result.document).toBeDefined();

    const document = result.document as XmlSchemaDocument;
    expect(document.rootElement?.getName()).toBe('CSV');

    expect(result.rootElementOptions).toContainEqual({ namespaceUri: '', name: 'CSV' });
    expect(result.rootElementOptions).toContainEqual({ namespaceUri: '', name: 'ID' });
  });

  describe('with xs:include', () => {
    it('should resolve xs:include with relative path', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'MainWithInclude.xsd': getMainWithIncludeXsd(),
          'CommonTypes.xsd': getCommonTypesXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();

      const mainElement = document.fields[0];
      expect(mainElement.name).toBe('Main');
      expect(mainElement.namedTypeFragmentRefs).toHaveLength(1);

      const commonTypeRef = mainElement.namedTypeFragmentRefs[0];
      const commonType = document.namedTypeFragments[commonTypeRef];
      expect(commonType).toBeDefined();
      expect(commonType.fields).toHaveLength(2);
      expect(commonType.fields[0].name).toBe('field1');
      expect(commonType.fields[1].name).toBe('field2');
    });

    it('should resolve xs:include with simple filename in subdirectory', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="common.xsd"/>
  <xs:element name="Main" type="CommonType"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'schemas/main.xsd': mainSchema,
          'schemas/common.xsd': getCommonTypesXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();
    });

    it('should throw clear error when included schema not in definitionFiles', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'MainWithInclude.xsd': getMainWithIncludeXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors![0].message).toContain('Missing required schema');
      expect(result.errors![0].message).toContain('CommonTypes.xsd');
      expect(result.errors![0].message).toContain('MainWithInclude.xsd');
    });

    it('should load multiple schemas with same targetNamespace connected via xs:include', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'MultiIncludeMain.xsd': getMultiIncludeMainXsd(),
          'MultiIncludeComponentA.xsd': getMultiIncludeComponentAXsd(),
          'MultiIncludeComponentB.xsd': getMultiIncludeComponentBXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).not.toBe('error');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();

      const rootElement = document.fields[0];
      expect(rootElement.name).toBe('Root');
      expect(rootElement.fields).toHaveLength(2);
      expect(rootElement.fields[0].name).toBe('partA');
      expect(rootElement.fields[1].name).toBe('partB');
    });
  });

  describe('with xs:import', () => {
    it('should resolve xs:import with namespace and schemaLocation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'MainWithImport.xsd': getMainWithImportXsd(),
          'ImportedTypes.xsd': getImportedTypesXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();

      const rootElement = document.fields[0];
      expect(rootElement.name).toBe('Root');
      expect(rootElement.fields.length).toBeGreaterThan(0);

      const importedField = rootElement.fields.find((f) => f.name === 'imported');
      expect(importedField).toBeDefined();
    });

    it('should resolve xs:import with relative schemaLocation', () => {
      const mainSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/main"
           xmlns:types="http://example.com/types">
  <xs:import namespace="http://example.com/types" schemaLocation="types.xsd"/>
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="imported" type="types:ImportedType"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'schemas/main.xsd': mainSchema,
          'schemas/types.xsd': getImportedTypesXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();
    });

    it('should handle multiple schemas importing same common schema', () => {
      const schema1 = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/schema1"
           xmlns:types="http://example.com/types">
  <xs:import namespace="http://example.com/types" schemaLocation="ImportedTypes.xsd"/>
  <xs:element name="Element1" type="types:ImportedType"/>
</xs:schema>`;

      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'schema1.xsd': schema1,
          'ImportedTypes.xsd': getImportedTypesXsd(),
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();
    });
  });

  it('should load attribute with inline simple type without crashing', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'InlineAttrSimpleType.xsd': getInlineAttrSimpleTypeXsd() },
      { namespaceUri: '', name: 'Root' },
    );

    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields[0].name).toBe('Root');

    const statusAttr = document.fields[0].fields.find((f) => f.name === 'Status' && f.isAttribute);
    expect(statusAttr).toBeDefined();
    expect(statusAttr!.type).toEqual(Types.AnyType);
  });

  it('should load large anonymous-typed global element ref schema within time budget', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'AnonymousGlobalElementRefLarge.xsd': getAnonymousGlobalElementRefLargeXsd() },
      { namespaceUri: '', name: 'Root' },
    );

    const start = performance.now();
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    const elapsed = performance.now() - start;

    expect(result.validationStatus).toBe('success');
    expect(result.document).toBeDefined();
    expect(elapsed).toBeLessThan(5000);

    const document = result.document as XmlSchemaDocument;
    for (const name of ['TypeA01', 'TypeB01', 'TypeC01', 'TypeD01', 'TypeE01', 'TypeF01']) {
      expect(document.namedTypeFragments[XmlSchemaDocumentUtilService.buildElementFragmentKey('', name)]).toBeDefined();
    }

    const bigContainerFragment = document.namedTypeFragments['BigContainer'];
    expect(bigContainerFragment).toBeDefined();
    // BigContainer has xs:choice wrapping all TypeA elements
    const choiceWrapper = bigContainerFragment.fields.find((f) => f.wrapperKind === 'choice');
    expect(choiceWrapper).toBeDefined();
    const typeA01Field = choiceWrapper!.fields.find((f) => f.name === 'TypeA01');
    expect(typeA01Field).toBeDefined();
    expect(typeA01Field!.type).toEqual(Types.Container);
  });

  describe('Field descriptions from xs:annotation/xs:documentation', () => {
    it('should extract description from element annotation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'AnnotatedFields.xsd': getAnnotatedFieldsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;

      const customerElement = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
      const fields: XmlSchemaField[] = [];
      XmlSchemaDocumentService.populateElement(document, fields, customerElement);

      const customerField = fields[0];
      expect(customerField.name).toBe('Customer');
      expect(customerField.description).toBe(
        'Represents a customer entity with contact information and purchase history',
      );

      const nameField = customerField.fields.find((f) => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField!.description).toBe("Customer's full legal name");

      const emailField = customerField.fields.find((f) => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField!.description).toBe('Primary email address for customer communications');

      const ageField = customerField.fields.find((f) => f.name === 'age');
      expect(ageField).toBeDefined();
      expect(ageField!.description).toBe("Customer's age in years");
    });

    it('should extract description from attribute annotation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'AnnotatedFields.xsd': getAnnotatedFieldsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;

      const customerElement = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
      const fields: XmlSchemaField[] = [];
      XmlSchemaDocumentService.populateElement(document, fields, customerElement);

      const customerField = fields[0];
      const idAttr = customerField.fields.find((f) => f.isAttribute && f.name === 'id');
      expect(idAttr).toBeDefined();
      expect(idAttr!.description).toBe('Unique customer identifier in the system');

      const statusAttr = customerField.fields.find((f) => f.isAttribute && f.name === 'status');
      expect(statusAttr).toBeDefined();
      expect(statusAttr!.description).toBe('Current customer status (active, inactive, suspended)');
    });

    it('should handle elements without annotation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'AnnotatedFields.xsd': getAnnotatedFieldsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;

      const customerElement = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
      const fields: XmlSchemaField[] = [];
      XmlSchemaDocumentService.populateElement(document, fields, customerElement);

      const customerField = fields[0];
      const noAnnotationField = customerField.fields.find((f) => f.name === 'noAnnotation');
      expect(noAnnotationField).toBeDefined();
      expect(noAnnotationField!.description).toBeUndefined();
    });

    it('should handle attributes without annotation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'AnnotatedFields.xsd': getAnnotatedFieldsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;

      const customerElement = XmlSchemaDocumentUtilService.getFirstElement(document.xmlSchemaCollection)!;
      const fields: XmlSchemaField[] = [];
      XmlSchemaDocumentService.populateElement(document, fields, customerElement);

      const customerField = fields[0];
      const noAnnotationAttr = customerField.fields.find((f) => f.isAttribute && f.name === 'noAnnotationAttr');
      expect(noAnnotationAttr).toBeDefined();
      expect(noAnnotationAttr!.description).toBeUndefined();
    });

    it('should extract description from nested complex type elements', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'AnnotatedFields.xsd': getAnnotatedFieldsXsd(),
        },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;

      // Check that the AddressType fragment has descriptions
      // QName.toString() format is {namespace}localPart
      const addressTypeFragmentKey = '{http://www.example.com/annotated}AddressType';
      const addressTypeFragment = document.namedTypeFragments[addressTypeFragmentKey];
      expect(addressTypeFragment).toBeDefined();

      const streetField = addressTypeFragment.fields.find((f) => f.name === 'street');
      expect(streetField).toBeDefined();
      expect(streetField!.description).toBe('Street address including number and name');

      const cityField = addressTypeFragment.fields.find((f) => f.name === 'city');
      expect(cityField).toBeDefined();
      expect(cityField!.description).toBe('City or town name');

      const zipCodeField = addressTypeFragment.fields.find((f) => f.name === 'zipCode');
      expect(zipCodeField).toBeDefined();
      expect(zipCodeField!.description).toBe('Postal or ZIP code');
    });
  });
});
