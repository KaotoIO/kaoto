import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import {
  camelSpringXsd,
  commonTypesXsd,
  elementRefXsd,
  extensionComplexXsd,
  extensionSimpleXsd,
  importedTypesXsd,
  invalidComplexExtensionXsd,
  mainWithImportXsd,
  mainWithIncludeXsd,
  multiLevelExtensionXsd,
  multiLevelRestrictionXsd,
  restrictionComplexXsd,
  restrictionInheritanceXsd,
  restrictionSimpleXsd,
  schemaTestXsd,
  shipOrderEmptyFirstLineXsd,
  shipOrderXsd,
  simpleTypeInheritanceXsd,
  testDocumentXsd,
} from '../stubs/datamapper/data-mapper';
import { QName } from '../xml-schema-ts/QName';
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
        'shipOrder.xsd': shipOrderXsd,
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
    expect(fields[0].name).toEqual('ShipOrder');
    expect(fields[0].fields[3].name).toEqual('Item');
    const itemTitleField = fields[0].fields[3].fields[0];
    expect(itemTitleField.name).toEqual('Title');
    expect(itemTitleField.type).not.toEqual(Types.Container);
  });

  it('should parse TestDocument XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'testDocument.xsd': testDocumentXsd,
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

  it('should parse camel-spring.xsd XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'camel-spring.xsd': camelSpringXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);
    const aggregate = document.fields[0];
    expect(aggregate.fields.length).toBe(0);
    expect(aggregate.namedTypeFragmentRefs.length).toEqual(1);
    expect(aggregate.namedTypeFragmentRefs[0]).toEqual('{http://camel.apache.org/schema/spring}aggregateDefinition');
    const aggregateDef = document.namedTypeFragments[aggregate.namedTypeFragmentRefs[0]];

    expect(aggregateDef.fields.length).toBeGreaterThanOrEqual(100);

    const outputDef = document.namedTypeFragments['{http://camel.apache.org/schema/spring}output'];
    expect(outputDef).toBeDefined();

    expect(outputDef.fields.length).toBeGreaterThanOrEqual(2);

    const processorDef = document.namedTypeFragments['{http://camel.apache.org/schema/spring}processorDefinition'];
    expect(processorDef).toBeDefined();

    expect(processorDef.fields.length).toBeGreaterThanOrEqual(2);

    const optionalIdentifiedDef =
      document.namedTypeFragments['{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition'];
    expect(optionalIdentifiedDef).toBeDefined();
    expect(optionalIdentifiedDef.fields.length).toEqual(3);
  });

  it('should parse ExtensionSimple.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': extensionSimpleXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);
    const product = document.fields[0];
    expect(product.name).toEqual('Product');
    expect(product.fields.length).toEqual(2);

    const nameField = product.fields[0];
    expect(nameField.name).toEqual('name');
    expect(nameField.namedTypeFragmentRefs.length).toEqual(1);
    const extendedStringRef = nameField.namedTypeFragmentRefs[0];
    const extendedStringType = document.namedTypeFragments[extendedStringRef];
    expect(extendedStringType.fields.length).toEqual(2);
    expect(extendedStringType.fields[0].name).toEqual('lang');
    expect(extendedStringType.fields[0].isAttribute).toBeTruthy();
    expect(extendedStringType.fields[1].name).toEqual('format');
    expect(extendedStringType.fields[1].isAttribute).toBeTruthy();

    const priceField = product.fields[1];
    expect(priceField.name).toEqual('price');
    expect(priceField.namedTypeFragmentRefs.length).toEqual(1);

    const priceTypeRef = priceField.namedTypeFragmentRefs[0];
    expect(priceTypeRef).toEqual('{http://www.example.com/SIMPLE}PriceType');
    const priceType = document.namedTypeFragments[priceTypeRef];
    expect(priceType.fields.length).toEqual(3);
    expect(priceType.fields[0].name).toEqual('currency');
    expect(priceType.fields[0].isAttribute).toBeTruthy();
    expect(priceType.fields[1].name).toEqual('taxIncluded');
    expect(priceType.fields[1].isAttribute).toBeTruthy();
    expect(priceType.fields[2].name).toEqual('discount');
    expect(priceType.fields[2].isAttribute).toBeTruthy();
    expect(priceType.namedTypeFragmentRefs.length).toEqual(0);

    const basePrice = document.namedTypeFragments['{http://www.example.com/SIMPLE}BasePrice'];
    expect(basePrice).toBeDefined();
    expect(basePrice.fields.length).toEqual(2);
    expect(basePrice.fields[0].name).toEqual('currency');
    expect(basePrice.fields[0].namedTypeFragmentRefs.length).toEqual(1);

    const currencyTypeRef = basePrice.fields[0].namedTypeFragmentRefs[0];
    expect(currencyTypeRef).toEqual('{http://www.example.com/SIMPLE}CurrencyType');
    const currencyType = document.namedTypeFragments[currencyTypeRef];
    expect(currencyType.type).toEqual(Types.Decimal);

    expect(basePrice.fields[0].isAttribute).toBeTruthy();
    expect(basePrice.fields[1].name).toEqual('taxIncluded');
    expect(basePrice.fields[1].isAttribute).toBeTruthy();
  });

  it('should parse ExtensionComplex.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'extensionComplex.xsd': extensionComplexXsd },
      { namespaceUri: 'http://www.example.com/TEST', name: 'Request' },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);
    const request = document.fields[0];
    expect(request.name).toEqual('Request');

    expect(request.fields.length).toEqual(3);
    expect(request.fields[0].name).toEqual('timestamp'); // from Message
    expect(request.fields[1].name).toEqual('user'); // from BaseRequest
    expect(request.fields[2].name).toEqual('name'); // from Request

    const baseRequestFragment = document.namedTypeFragments['{http://www.example.com/TEST}BaseRequest'];
    expect(baseRequestFragment).toBeDefined();
    expect(baseRequestFragment.fields.length).toEqual(2);
    expect(baseRequestFragment.fields[0].name).toEqual('timestamp'); // from Message
    expect(baseRequestFragment.fields[1].name).toEqual('user'); // from BaseRequest

    const messageFragment = document.namedTypeFragments['{http://www.example.com/TEST}Message'];
    expect(messageFragment).toBeDefined();
    expect(messageFragment.fields.length).toEqual(1);
    expect(messageFragment.fields[0].name).toEqual('timestamp');
  });

  it('should create XML schema document with routes as a root element', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'camel-spring.xsd': camelSpringXsd },
      { namespaceUri: 'http://camel.apache.org/schema/spring', name: 'routes' },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);
    const routes = document.fields[0];
    expect(routes.fields.length).toEqual(0);

    const routesRef = routes.namedTypeFragmentRefs[0];
    const routeDef = document.namedTypeFragments[routesRef];
    expect(routeDef.fields.length).toBeGreaterThanOrEqual(1);
    const route = routeDef.fields.find((f) => f.name === 'route');
    expect(route).toBeDefined();

    const baseTypeDef =
      document.namedTypeFragments['{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition'];
    expect(baseTypeDef).toBeDefined();
    expect(baseTypeDef.fields.length).toEqual(3);
  });

  it('should create XML Schema Document', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'shipOrder.xsd': shipOrderXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const doc = result.document as XmlSchemaDocument;
    expect(doc.documentType).toEqual(DocumentType.SOURCE_BODY);
    expect(doc.documentId).toEqual('Body');
    expect(doc.name).toEqual('Body');
    expect(doc.fields.length).toEqual(1);
  });

  it('should throw an error if there is a parse error on the XML schema', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      'ShipOrderEmptyFirstLine',
      { 'ShipOrderEmptyFirstLine.xsd': shipOrderEmptyFirstLineXsd },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('error');
    expect(result.validationMessage).toContain('an XML declaration must be at the start of the document');
  });

  it('should parse SchemaTest.xsd with advanced features', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'schemaTest.xsd': schemaTestXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);

    const root = document.fields[0];
    expect(root.name).toEqual('Root');
    expect(root.fields.length).toEqual(2);

    const person = root.fields[0];
    expect(person.name).toEqual('person');
    expect(person.namedTypeFragmentRefs.length).toEqual(1);
    expect(person.namedTypeFragmentRefs[0]).toEqual('{http://www.example.com/test}PersonType');

    const personType = document.namedTypeFragments[person.namedTypeFragmentRefs[0]];
    expect(personType).toBeDefined();

    expect(personType.fields.length).toEqual(11);

    const nameField = personType.fields.find((f) => f.name === 'name');
    expect(nameField).toBeDefined();

    const streetField = personType.fields.find((f) => f.name === 'street');
    expect(streetField).toBeDefined();
    const cityField = personType.fields.find((f) => f.name === 'city');
    expect(cityField).toBeDefined();

    const emailField = personType.fields.find((f) => f.name === 'email');
    expect(emailField).toBeDefined();
    const phoneField = personType.fields.find((f) => f.name === 'phone');
    expect(phoneField).toBeDefined();

    const faxField = personType.fields.find((f) => f.name === 'fax');
    expect(faxField).toBeDefined();

    const createdByField = personType.fields.find((f) => f.name === 'createdBy');
    expect(createdByField).toBeDefined();
    const createdDateField = personType.fields.find((f) => f.name === 'createdDate');
    expect(createdDateField).toBeDefined();

    const idAttr = personType.fields.find((f) => f.name === 'id' && f.isAttribute);
    expect(idAttr).toBeDefined();
    expect(idAttr!.minOccurs).toEqual(1); // required
    expect(idAttr!.maxOccurs).toEqual(1);

    const versionAttr = personType.fields.find((f) => f.name === 'version' && f.isAttribute);
    expect(versionAttr).toBeDefined();
    expect(versionAttr!.minOccurs).toEqual(0); // optional
    expect(versionAttr!.maxOccurs).toEqual(1);

    const statusAttr = personType.fields.find((f) => f.name === 'status' && f.isAttribute);
    expect(statusAttr).toBeDefined();
    expect(statusAttr!.minOccurs).toEqual(0); // prohibited
    expect(statusAttr!.maxOccurs).toEqual(0);

    const restricted = root.fields[1];
    expect(restricted.name).toEqual('restricted');
    expect(restricted.namedTypeFragmentRefs.length).toEqual(1);

    const restrictedType = document.namedTypeFragments[restricted.namedTypeFragmentRefs[0]];
    expect(restrictedType).toBeDefined();
  });

  it('should handle XmlSchemaField getExpression with namespaceMap', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': extensionSimpleXsd,
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
    expect(expression).toEqual('simple:price');

    const emptyMap = {};
    const expressionNoNs = priceField!.getExpression(emptyMap);
    expect(expressionNoNs).toEqual('price');

    const priceTypeRef = priceField!.namedTypeFragmentRefs[0];
    const priceType = document.namedTypeFragments[priceTypeRef];
    const discountAttr = priceType.fields.find((f) => f.name === 'discount' && f.isAttribute);
    expect(discountAttr).toBeDefined();

    let attrExpression = discountAttr?.getExpression({});
    expect(attrExpression).toEqual('@discount');
    attrExpression = discountAttr!.getExpression(namespaceMap);
    expect(attrExpression).toEqual('@discount');
  });

  it('should parse RestrictionSimple.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionSimple.xsd': restrictionSimpleXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);

    const priceField = document.fields[0];
    expect(priceField.name).toEqual('Price');
    expect(priceField.namedTypeFragmentRefs.length).toEqual(1);

    const euroPriceRef = priceField.namedTypeFragmentRefs[0];
    expect(euroPriceRef).toEqual('{http://www.example.com/RESTRICT}EuroPrice');
    const euroPriceType = document.namedTypeFragments[euroPriceRef];
    expect(euroPriceType).toBeDefined();
    expect(euroPriceType.fields.length).toEqual(2);
    expect(euroPriceType.fields[0].name).toEqual('currency');
    expect(euroPriceType.fields[0].isAttribute).toBeTruthy();
    expect(euroPriceType.fields[0].minOccurs).toEqual(1);
    expect(euroPriceType.fields[0].defaultValue).toEqual('EUR');
    expect(euroPriceType.fields[1].name).toEqual('taxIncluded');
    expect(euroPriceType.fields[1].isAttribute).toBeTruthy();

    expect(euroPriceType.namedTypeFragmentRefs.length).toEqual(0);

    const basePriceType = document.namedTypeFragments['{http://www.example.com/RESTRICT}BasePrice'];
    expect(basePriceType).toBeDefined();
    expect(basePriceType.fields.length).toEqual(2);
    expect(basePriceType.fields[0].name).toEqual('currency');
    expect(basePriceType.fields[0].isAttribute).toBeTruthy();
    expect(basePriceType.fields[1].name).toEqual('taxIncluded');
    expect(basePriceType.fields[1].isAttribute).toBeTruthy();
  });

  it('should parse RestrictionComplex.xsd', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionComplex.xsd': restrictionComplexXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);

    const addressField = document.fields[0];
    expect(addressField.name).toEqual('Address');
    expect(addressField.namedTypeFragmentRefs.length).toEqual(1);

    const simpleAddressRef = addressField.namedTypeFragmentRefs[0];
    expect(simpleAddressRef).toEqual('{http://www.example.com/RESTRICT}SimpleAddress');
    const simpleAddressType = document.namedTypeFragments[simpleAddressRef];
    expect(simpleAddressType).toBeDefined();
    expect(simpleAddressType.fields.length).toEqual(6);
    expect(simpleAddressType.fields[0].name).toEqual('id');
    expect(simpleAddressType.fields[0].isAttribute).toBeTruthy();
    expect(simpleAddressType.fields[0].minOccurs).toEqual(1);
    expect(simpleAddressType.fields[1].name).toEqual('type');
    expect(simpleAddressType.fields[1].isAttribute).toBeTruthy();
    expect(simpleAddressType.fields[2].name).toEqual('street');
    expect(simpleAddressType.fields[2].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[3].name).toEqual('city');
    expect(simpleAddressType.fields[3].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[4].name).toEqual('zip');
    expect(simpleAddressType.fields[4].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[5].name).toEqual('country');
    expect(simpleAddressType.fields[5].isAttribute).toBeFalsy();
    expect(simpleAddressType.fields[5].maxOccurs).toEqual(0);

    expect(simpleAddressType.namedTypeFragmentRefs.length).toEqual(0);

    const baseAddressType = document.namedTypeFragments['{http://www.example.com/RESTRICT}BaseAddress'];
    expect(baseAddressType).toBeDefined();
    expect(baseAddressType.fields.length).toEqual(6);
    expect(baseAddressType.fields[0].name).toEqual('id');
    expect(baseAddressType.fields[0].isAttribute).toBeTruthy();
    expect(baseAddressType.fields[1].name).toEqual('type');
    expect(baseAddressType.fields[1].isAttribute).toBeTruthy();
    expect(baseAddressType.fields[2].name).toEqual('street');
    expect(baseAddressType.fields[2].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[3].name).toEqual('city');
    expect(baseAddressType.fields[3].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[4].name).toEqual('zip');
    expect(baseAddressType.fields[4].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[5].name).toEqual('country');
    expect(baseAddressType.fields[5].isAttribute).toBeFalsy();
    expect(baseAddressType.fields[5].maxOccurs).toEqual(1);
  });

  it('should parse RestrictionInheritance.xsd with nested content models', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'restrictionInheritance.xsd': restrictionInheritanceXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);

    const dataField = document.fields[0];
    expect(dataField.name).toEqual('Data');
    expect(dataField.namedTypeFragmentRefs.length).toEqual(1);

    const restrictedTypeRef = dataField.namedTypeFragmentRefs[0];
    expect(restrictedTypeRef).toEqual('{http://www.example.com/INHERIT}RestrictedType');
    const restrictedType = document.namedTypeFragments[restrictedTypeRef];
    expect(restrictedType).toBeDefined();

    expect(restrictedType.fields.length).toEqual(5);
    expect(restrictedType.fields[0].name).toEqual('version');
    expect(restrictedType.fields[0].isAttribute).toBeTruthy();
    expect(restrictedType.fields[1].name).toEqual('id');
    expect(restrictedType.fields[1].isAttribute).toBeTruthy();
    expect(restrictedType.fields[2].name).toEqual('timestamp');
    expect(restrictedType.fields[2].isAttribute).toBeFalsy();
    expect(restrictedType.fields[3].name).toEqual('required');
    expect(restrictedType.fields[3].isAttribute).toBeFalsy();
    expect(restrictedType.fields[4].name).toEqual('optional');
    expect(restrictedType.fields[4].isAttribute).toBeFalsy();

    const baseType = document.namedTypeFragments['{http://www.example.com/INHERIT}BaseType'];
    expect(baseType).toBeDefined();
    expect(baseType.fields.length).toEqual(5);
    expect(baseType.fields[0].name).toEqual('version');
    expect(baseType.fields[0].isAttribute).toBeTruthy();
    expect(baseType.fields[1].name).toEqual('id');
    expect(baseType.fields[1].isAttribute).toBeTruthy();
    expect(baseType.fields[2].name).toEqual('timestamp');
    expect(baseType.fields[2].isAttribute).toBeFalsy();
    expect(baseType.fields[3].name).toEqual('required');
    expect(baseType.fields[3].isAttribute).toBeFalsy();
    expect(baseType.fields[4].name).toEqual('optional');
    expect(baseType.fields[4].isAttribute).toBeFalsy();

    const grandparentType = document.namedTypeFragments['{http://www.example.com/INHERIT}GrandparentType'];
    expect(grandparentType).toBeDefined();
    expect(grandparentType.fields.length).toEqual(2);
    expect(grandparentType.fields[0].name).toEqual('version');
    expect(grandparentType.fields[0].isAttribute).toBeTruthy();
    expect(grandparentType.fields[1].name).toEqual('timestamp');
    expect(grandparentType.fields[1].isAttribute).toBeFalsy();
  });

  it('should handle multi-level extension inheritance', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'multiLevelExtension.xsd': multiLevelExtensionXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);

    const dataField = document.fields[0];
    expect(dataField.name).toEqual('Data');
    expect(dataField.namedTypeFragmentRefs.length).toEqual(1);

    const childTypeRef = dataField.namedTypeFragmentRefs[0];
    expect(childTypeRef).toEqual('{http://www.example.com/MULTI}ChildType');
    const childType = document.namedTypeFragments[childTypeRef];
    expect(childType).toBeDefined();

    expect(childType.fields.length).toEqual(6);
    expect(childType.fields[0].name).toEqual('grandparentAttr');
    expect(childType.fields[0].isAttribute).toBeTruthy();
    expect(childType.fields[1].name).toEqual('parentAttr');
    expect(childType.fields[1].isAttribute).toBeTruthy();
    expect(childType.fields[2].name).toEqual('childAttr');
    expect(childType.fields[2].isAttribute).toBeTruthy();
    expect(childType.fields[3].name).toEqual('grandparentField');
    expect(childType.fields[3].isAttribute).toBeFalsy();
    expect(childType.fields[4].name).toEqual('parentField');
    expect(childType.fields[4].isAttribute).toBeFalsy();
    expect(childType.fields[5].name).toEqual('childField');
    expect(childType.fields[5].isAttribute).toBeFalsy();

    const parentType = document.namedTypeFragments['{http://www.example.com/MULTI}ParentType'];
    expect(parentType).toBeDefined();
    expect(parentType.fields.length).toEqual(4);
    expect(parentType.fields[0].name).toEqual('grandparentAttr');
    expect(parentType.fields[1].name).toEqual('parentAttr');
    expect(parentType.fields[2].name).toEqual('grandparentField');
    expect(parentType.fields[3].name).toEqual('parentField');

    const grandparentType = document.namedTypeFragments['{http://www.example.com/MULTI}GrandparentType'];
    expect(grandparentType).toBeDefined();
    expect(grandparentType.fields.length).toEqual(2);
    expect(grandparentType.fields[0].name).toEqual('grandparentAttr');
    expect(grandparentType.fields[1].name).toEqual('grandparentField');
  });

  it('should handle multi-level restriction inheritance', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'multiLevelRestriction.xsd': multiLevelRestrictionXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);

    const dataField = document.fields[0];
    expect(dataField.name).toEqual('Data');
    expect(dataField.namedTypeFragmentRefs.length).toEqual(1);

    const strictEuroPriceRef = dataField.namedTypeFragmentRefs[0];
    expect(strictEuroPriceRef).toEqual('{http://www.example.com/MULTIRESTRICT}StrictEuroPrice');
    const strictEuroPriceType = document.namedTypeFragments[strictEuroPriceRef];
    expect(strictEuroPriceType).toBeDefined();

    expect(strictEuroPriceType.fields.length).toEqual(2);
    expect(strictEuroPriceType.fields[0].name).toEqual('currency');
    expect(strictEuroPriceType.fields[0].isAttribute).toBeTruthy();
    expect(strictEuroPriceType.fields[0].defaultValue).toEqual('EUR');
    expect(strictEuroPriceType.fields[1].name).toEqual('taxIncluded');
    expect(strictEuroPriceType.fields[1].isAttribute).toBeTruthy();
    expect(strictEuroPriceType.fields[1].defaultValue).toEqual('true');

    const euroPriceType = document.namedTypeFragments['{http://www.example.com/MULTIRESTRICT}EuroPrice'];
    expect(euroPriceType).toBeDefined();
    expect(euroPriceType.fields.length).toEqual(2);
    expect(euroPriceType.fields[0].name).toEqual('currency');
    expect(euroPriceType.fields[0].isAttribute).toBeTruthy();
    expect(euroPriceType.fields[0].defaultValue).toEqual('EUR');
    expect(euroPriceType.fields[1].name).toEqual('taxIncluded');
    expect(euroPriceType.fields[1].isAttribute).toBeTruthy();

    const basePriceType = document.namedTypeFragments['{http://www.example.com/MULTIRESTRICT}BasePrice'];
    expect(basePriceType).toBeDefined();
    expect(basePriceType.fields.length).toEqual(2);
    expect(basePriceType.fields[0].name).toEqual('currency');
    expect(basePriceType.fields[0].isAttribute).toBeTruthy();
    expect(basePriceType.fields[1].name).toEqual('taxIncluded');
    expect(basePriceType.fields[1].isAttribute).toBeTruthy();
  });

  it('should handle XmlSchemaField isIdentical method correctly', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'extensionSimple.xsd': extensionSimpleXsd,
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
        'restrictionSimple.xsd': restrictionSimpleXsd,
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
    expect(currencyAttr!.defaultValue).toEqual('EUR');
    expect(currencyAttr!.minOccurs).toEqual(1); // REQUIRED
    expect(currencyAttr!.maxOccurs).toEqual(1);

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
        'extensionSimple.xsd': extensionSimpleXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;

    const product = document.fields[0];
    const nameField = XmlSchemaDocumentUtilService.getChildField(product, 'name', 'http://www.example.com/SIMPLE');
    expect(nameField).toBeDefined();
    expect(nameField!.name).toEqual('name');

    const priceField = XmlSchemaDocumentUtilService.getChildField(product, 'price', 'http://www.example.com/SIMPLE');
    expect(priceField).toBeDefined();
    expect(priceField!.name).toEqual('price');

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
        'invalidComplexExtension.xsd': invalidComplexExtensionXsd,
      },
    );
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    expect(document).toBeDefined();

    const productField = document.fields[0];
    expect(productField.name).toEqual('Product');

    const extendedProductRef = productField.namedTypeFragmentRefs[0];
    expect(extendedProductRef).toEqual('{http://www.example.com/CONFLICT}ExtendedProduct');
    const extendedProduct = document.namedTypeFragments[extendedProductRef];
    expect(extendedProduct).toBeDefined();

    const fields = extendedProduct.fields;
    expect(fields.length).toEqual(3);

    expect(fields[0].name).toEqual('name');
    expect(fields[0].isAttribute).toBeFalsy();
    expect(fields[0].defaultValue).toEqual('Unknown');
    expect(fields[0].minOccurs).toEqual(0);
    expect(fields[0].maxOccurs).toEqual(1);

    expect(fields[1].name).toEqual('price');
    expect(fields[1].isAttribute).toBeFalsy();
    expect(fields[1].minOccurs).toEqual(1);
    expect(fields[1].maxOccurs).toEqual(1);

    expect(fields[2].name).toEqual('description');
    expect(fields[2].isAttribute).toBeFalsy();
    expect(fields[2].minOccurs).toEqual(0);

    const baseProduct = document.namedTypeFragments['{http://www.example.com/CONFLICT}BaseProduct'];
    expect(baseProduct).toBeDefined();
    expect(baseProduct.fields.length).toEqual(2);
    expect(baseProduct.fields[0].name).toEqual('name');
    expect(baseProduct.fields[0].defaultValue).toEqual('Unknown');
    expect(baseProduct.fields[0].minOccurs).toEqual(0);
    expect(baseProduct.fields[0].maxOccurs).toEqual(1);
    expect(baseProduct.fields[1].name).toEqual('price');
    expect(baseProduct.fields[1].minOccurs).toEqual(1);
    expect(baseProduct.fields[1].maxOccurs).toEqual(1);
  });

  it('should handle simpleType inheritance with extension and restriction', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        'simpleTypeInheritance.xsd': simpleTypeInheritanceXsd,
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
    expect(extendedValueType.fields.length).toEqual(2);
    expect(extendedValueType.fields[0].name).toEqual('lang');
    expect(extendedValueType.fields[0].isAttribute).toBeTruthy();
    expect(extendedValueType.fields[1].name).toEqual('format');
    expect(extendedValueType.fields[1].isAttribute).toBeTruthy();

    const restrictedValueTypeRef = '{http://www.example.com/SIMPLEINHERIT}RestrictedValueType';
    const restrictedValueType = document.namedTypeFragments[restrictedValueTypeRef];
    expect(restrictedValueType).toBeDefined();
    expect(restrictedValueType.fields.length).toEqual(1);
    expect(restrictedValueType.fields[0].name).toEqual('lang');
    expect(restrictedValueType.fields[0].isAttribute).toBeTruthy();
    expect(restrictedValueType.fields[0].defaultValue).toEqual('en');
  });

  it('should respect root element choice for schemas with element references (issue #2876)', () => {
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'element-ref.xsd': elementRefXsd },
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
          'MainWithInclude.xsd': mainWithIncludeXsd,
          'CommonTypes.xsd': commonTypesXsd,
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();

      const mainElement = document.fields[0];
      expect(mainElement.name).toEqual('Main');
      expect(mainElement.namedTypeFragmentRefs.length).toEqual(1);

      const commonTypeRef = mainElement.namedTypeFragmentRefs[0];
      const commonType = document.namedTypeFragments[commonTypeRef];
      expect(commonType).toBeDefined();
      expect(commonType.fields.length).toEqual(2);
      expect(commonType.fields[0].name).toEqual('field1');
      expect(commonType.fields[1].name).toEqual('field2');
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
          'schemas/common.xsd': commonTypesXsd,
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
          'MainWithInclude.xsd': mainWithIncludeXsd,
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.validationMessage).toContain('Missing required schema');
      expect(result.validationMessage).toContain('CommonTypes.xsd');
      expect(result.validationMessage).toContain('MainWithInclude.xsd');
    });
  });

  describe('with xs:import', () => {
    it('should resolve xs:import with namespace and schemaLocation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'MainWithImport.xsd': mainWithImportXsd,
          'ImportedTypes.xsd': importedTypesXsd,
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();

      const rootElement = document.fields[0];
      expect(rootElement.name).toEqual('Root');
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
          'schemas/types.xsd': importedTypesXsd,
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
          'ImportedTypes.xsd': importedTypesXsd,
        },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      expect(document).toBeDefined();
    });
  });

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
      expect(result.validationMessage).toContain('Missing required schema');
      expect(result.validationMessage).toContain('Missing.xsd');
      expect(result.validationMessage).toContain('main.xsd');
      expect(result.validationMessage).toContain('xs:include');
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
      expect(result.validationMessage).toContain('Missing required schema');
      expect(result.validationMessage).toContain('types.xsd');
      expect(result.validationMessage).toContain('xs:import');
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
      expect(result.validationMessage).toContain('Circular xs:include');
    });

    it('should succeed with circular imports (different namespaces)', () => {
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
      expect(result.validationStatus).toBe('success');
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
});
