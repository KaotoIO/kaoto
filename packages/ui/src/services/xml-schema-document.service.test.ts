import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';
import { BODY_DOCUMENT_ID, DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import {
  camelSpringXsd,
  shipOrderXsd,
  shipOrderEmptyFirstLineXsd,
  testDocumentXsd,
  extensionSimpleXsd,
  extensionComplexXsd,
  schemaTestXsd,
} from '../stubs/datamapper/data-mapper';

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
    expect(aggregateDef.fields.length).toEqual(100);
    expect(aggregateDef.namedTypeFragmentRefs[0]).toEqual('{http://camel.apache.org/schema/spring}output');

    const outputDef = document.namedTypeFragments[aggregateDef.namedTypeFragmentRefs[0]];
    expect(outputDef.fields.length).toEqual(0);
    expect(outputDef.namedTypeFragmentRefs[0]).toEqual('{http://camel.apache.org/schema/spring}processorDefinition');
    const processorDef = document.namedTypeFragments[outputDef.namedTypeFragmentRefs[0]];
    expect(processorDef.fields.length).toEqual(2);
    expect(processorDef.namedTypeFragmentRefs[0]).toEqual(
      '{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition',
    );
    const optionalIdentifiedDef = document.namedTypeFragments[processorDef.namedTypeFragmentRefs[0]];
    expect(optionalIdentifiedDef.fields.length).toEqual(3);
    expect(optionalIdentifiedDef.namedTypeFragmentRefs.length).toEqual(0);
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
    expect(priceType.fields.length).toEqual(1);
    expect(priceType.fields[0].name).toEqual('discount');
    expect(priceType.fields[0].isAttribute).toBeTruthy();
    expect(priceType.namedTypeFragmentRefs.length).toEqual(1);

    const basePriceTypeRef = priceType.namedTypeFragmentRefs[0];
    expect(basePriceTypeRef).toEqual('{http://www.example.com/SIMPLE}BasePrice');
    const basePrice = document.namedTypeFragments[basePriceTypeRef];
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

    expect(request.fields.length).toEqual(1);
    expect(request.fields[0].name).toEqual('name');

    const baseRequestFragment = document.namedTypeFragments['{http://www.example.com/TEST}BaseRequest'];
    expect(baseRequestFragment).toBeDefined();
    expect(baseRequestFragment.fields.length).toEqual(1);
    expect(baseRequestFragment.fields[0].name).toEqual('user'); // from BaseRequest

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
    expect(routeDef.fields.length).toEqual(1);
    const route = routeDef.fields[0];
    expect(route.name).toEqual('route');

    expect(routeDef.namedTypeFragmentRefs.length).toEqual(1);
    const baseTypeRef = routeDef.namedTypeFragmentRefs[0];
    expect(baseTypeRef).toEqual('{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition');
    const baseTypeDef = document.namedTypeFragments[baseTypeRef];
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
});
