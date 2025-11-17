import { BODY_DOCUMENT_ID, DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import {
  camelSpringXsd,
  extensionComplexXsd,
  extensionSimpleXsd,
  invalidComplexExtensionXsd,
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
import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';

describe('XmlSchemaDocumentService', () => {
  it('should parse ShipOrder XML schema', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      shipOrderXsd,
    );
    expect(document).toBeDefined();
    const shipOrder = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      testDocumentXsd,
    );
    expect(document).toBeDefined();
    const testDoc = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, testDoc);
    expect(fields.length > 0).toBeTruthy();
  });

  it('should parse camel-spring.xsd XML schema', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      camelSpringXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      extensionSimpleXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      extensionComplexXsd,
      { namespaceUri: 'http://www.example.com/TEST', name: 'Request' },
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      camelSpringXsd,
      { namespaceUri: 'http://camel.apache.org/schema/spring', name: 'routes' },
    );
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
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      'ShipOrder.xsd',
      shipOrderXsd,
    );
    expect(doc.documentType).toEqual(DocumentType.SOURCE_BODY);
    expect(doc.documentId).toEqual('ShipOrder.xsd');
    expect(doc.name).toEqual('ShipOrder.xsd');
    expect(doc.fields.length).toEqual(1);
  });

  it('should throw an error if there is a parse error on the XML schema', () => {
    try {
      XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.SOURCE_BODY,
        'ShipOrderEmptyFirstLine.xsd',
        shipOrderEmptyFirstLineXsd,
      );
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.message).toContain('an XML declaration must be at the start of the document');
      return;
    }
    expect(true).toBeFalsy();
  });

  it('should parse SchemaTest.xsd with advanced features', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      schemaTestXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      extensionSimpleXsd,
    );

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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      restrictionSimpleXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      restrictionComplexXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      restrictionInheritanceXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      multiLevelExtensionXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      multiLevelRestrictionXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      extensionSimpleXsd,
    );

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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      restrictionSimpleXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      extensionSimpleXsd,
    );

    const product = document.fields[0];
    const nameField = XmlSchemaDocumentService.getChildField(product, 'name', 'http://www.example.com/SIMPLE');
    expect(nameField).toBeDefined();
    expect(nameField!.name).toEqual('name');

    const priceField = XmlSchemaDocumentService.getChildField(product, 'price', 'http://www.example.com/SIMPLE');
    expect(priceField).toBeDefined();
    expect(priceField!.name).toEqual('price');

    const nonExistent = XmlSchemaDocumentService.getChildField(product, 'nonexistent', 'http://www.example.com/SIMPLE');
    expect(nonExistent).toBeUndefined();

    const wrongNamespace = XmlSchemaDocumentService.getChildField(product, 'name', 'http://wrong.namespace');
    expect(wrongNamespace).toBeUndefined();
  });

  it('should handle extension that attempts to redefine base elements', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      invalidComplexExtensionXsd,
    );
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
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      simpleTypeInheritanceXsd,
    );
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
});
