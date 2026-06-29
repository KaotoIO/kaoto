import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  FieldItem,
  ForEachItem,
  IDocument,
  MappingTree,
  NS_XSL,
  PrimitiveDocument,
  Types,
  ValueSelector,
} from '../../models/datamapper';
import { NS_XPATH_FUNCTIONS } from '../../models/datamapper/standard-namespaces';
import {
  getAccountJsonSchema,
  getCartJsonSchema,
  getShipOrderJsonSchema,
  getShipOrderJsonXslt,
} from '../../stubs/datamapper/data-mapper';
import { JsonSchemaField } from '../document/json-schema/json-schema-document.model';
import { JsonSchemaDocumentService } from '../document/json-schema/json-schema-document.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { TO_JSON_TARGET_VARIABLE } from './mapping-serializer-json-addon';

describe('MappingSerializerService / JSON', () => {
  const accountDefinition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Account', {
    'Account.json': getAccountJsonSchema(),
  });
  const accountDocResult = JsonSchemaDocumentService.createJsonSchemaDocument(accountDefinition);
  expect(accountDocResult.validationStatus).toBe('success');
  const accountParamDoc = accountDocResult.document!;
  const cartDefinition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Cart', {
    'Cart.json': getCartJsonSchema(),
  });
  const cartDocResult = JsonSchemaDocumentService.createJsonSchemaDocument(cartDefinition);
  expect(cartDocResult.validationStatus).toBe('success');
  const cartParamDoc = cartDocResult.document!;
  const orderSequenceParamDoc = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'OrderSequence'),
  );
  const sourceParameterMap = new Map<string, IDocument>([
    ['OrderSequence', orderSequenceParamDoc],
    ['Account', accountParamDoc],
    ['Cart', cartParamDoc],
  ]);
  const targetDefinition = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.JSON_SCHEMA,
    BODY_DOCUMENT_ID,
    { 'ShipOrder.json': getShipOrderJsonSchema() },
  );
  const result = JsonSchemaDocumentService.createJsonSchemaDocument(targetDefinition);
  expect(result.validationStatus).toBe('success');
  const targetDoc = result.document!;

  describe('deserialize()', () => {
    it('should deserialize XSLT', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderJsonXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      expect(targetDoc.fields[0].fields[3].fields[0].fields).toHaveLength(3);
      const namespaces = mappingTree.namespaceMap;
      expect(mappingTree.children).toHaveLength(1);
      const root = mappingTree.children[0] as FieldItem;
      expect(root.field.name).toBe('map');
      expect(root.field.type).toEqual(Types.Container);
      expect(root.field.predicates).toHaveLength(0);
      expect(root.field.getExpression(namespaces)).toBe('fn:map');
      expect(root.children).toHaveLength(4);

      const orderId = root.children[0] as FieldItem;
      const orderIdJsonField = orderId.field as JsonSchemaField;
      expect(orderIdJsonField.key).toBe('OrderId');
      expect(orderId.field.type).toEqual(Types.String);
      expect(orderId.field.getExpression(namespaces)).toBe("fn:string[@key='OrderId']");
      expect(orderId.children).toHaveLength(1);
      const orderIdValue = orderId.children[0] as ValueSelector;
      expect(orderIdValue.expression).toBe(
        "upper-case(concat('ORD-', $Account-x/fn:map/fn:string[@key='AccountId'], '-', $OrderSequence))",
      );

      const orderPerson = root.children[1] as FieldItem;
      const orderPersonJsonField = orderPerson.field as JsonSchemaField;
      expect(orderPersonJsonField.key).toBe('OrderPerson');
      expect(orderPersonJsonField.type).toEqual(Types.String);
      expect(orderPersonJsonField.getExpression(namespaces)).toBe("fn:string[@key='OrderPerson']");

      const shipTo = root.children[2] as FieldItem;
      const shipToJsonField = shipTo.field as JsonSchemaField;
      expect(shipToJsonField.key).toBe('ShipTo');
      expect(shipToJsonField.type).toEqual(Types.Container);
      expect(shipToJsonField.getExpression(namespaces)).toBe("fn:map[@key='ShipTo']");
      expect(shipTo.children).toHaveLength(5);

      const shipToName = shipTo.children[0] as FieldItem;
      const shipToNameJsonField = shipToName.field as JsonSchemaField;
      expect(shipToNameJsonField.key).toBe('Name');
      expect(shipToNameJsonField.type).toEqual(Types.String);
      expect(shipToNameJsonField.getExpression(namespaces)).toBe("fn:string[@key='Name']");
      expect(shipToName.children).toHaveLength(1);
      const shipToNameValue = shipToName.children[0] as ValueSelector;
      expect(shipToNameValue.expression).toBe("$Account-x/fn:map/fn:string[@key='Name']");

      const shipToStreet = shipTo.children[1] as FieldItem;
      const shipToStreetJsonField = shipToStreet.field as JsonSchemaField;
      expect(shipToStreetJsonField.key).toBe('Street');
      expect(shipToStreetJsonField.type).toEqual(Types.String);
      expect(shipToStreetJsonField.getExpression(namespaces)).toBe("fn:string[@key='Street']");
      expect(shipToStreet.children).toHaveLength(1);
      const shipToStreetValue = shipToStreet.children[0] as ValueSelector;
      expect(shipToStreetValue.expression).toBe("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']");

      const shipToCity = shipTo.children[2] as FieldItem;
      const shipToCityJsonField = shipToCity.field as JsonSchemaField;
      expect(shipToCityJsonField.key).toBe('City');
      expect(shipToCityJsonField.type).toEqual(Types.String);
      expect(shipToCityJsonField.getExpression(namespaces)).toBe("fn:string[@key='City']");
      expect(shipToCity.children).toHaveLength(1);
      const shipToCityValue = shipToCity.children[0] as ValueSelector;
      expect(shipToCityValue.expression).toBe("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']");

      const shipToState = shipTo.children[3] as FieldItem;
      const shipToStateJsonField = shipToState.field as JsonSchemaField;
      expect(shipToStateJsonField.key).toBe('State');
      expect(shipToStateJsonField.type).toEqual(Types.String);
      expect(shipToStateJsonField.getExpression(namespaces)).toBe("fn:string[@key='State']");
      expect(shipToState.children).toHaveLength(1);
      const shipToStateValue = shipToState.children[0] as ValueSelector;
      expect(shipToStateValue.expression).toBe("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']");

      const shipToCountry = shipTo.children[4] as FieldItem;
      const shipToCountryJsonField = shipToCountry.field as JsonSchemaField;
      expect(shipToCountryJsonField.key).toBe('Country');
      expect(shipToCountryJsonField.type).toEqual(Types.String);
      expect(shipToCountryJsonField.getExpression(namespaces)).toBe("fn:string[@key='Country']");
      expect(shipToCountry.children).toHaveLength(1);
      const shipToCountryValue = shipToCountry.children[0] as ValueSelector;
      expect(shipToCountryValue.expression).toBe("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']");

      const item = root.children[3] as FieldItem;
      const itemJsonField = item.field as JsonSchemaField;
      expect(itemJsonField.key).toBe('Item');
      expect(itemJsonField.type).toEqual(Types.Array);
      expect(itemJsonField.getExpression(namespaces)).toBe("fn:array[@key='Item']");
      expect(item.children).toHaveLength(1);

      const forEach = item.children[0] as ForEachItem;
      expect(forEach.expression).toBe('$Cart-x/fn:array/fn:map');
      expect(forEach.children).toHaveLength(1);

      const forEachItem = forEach.children[0] as FieldItem;
      const forEachItemJsonField = forEachItem.field as JsonSchemaField;
      expect(forEachItemJsonField.key).toBe('');
      expect(forEachItemJsonField.type).toEqual(Types.Container);
      expect(forEachItemJsonField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
      expect(forEachItemJsonField.getExpression(namespaces)).toBe('fn:map');
      expect(forEachItem.children).toHaveLength(3);

      const title = forEachItem.children[0] as FieldItem;
      const titleJsonField = title.field as JsonSchemaField;
      expect(titleJsonField.key).toBe('Title');
      expect(titleJsonField.type).toEqual(Types.String);
      expect(titleJsonField.getExpression(namespaces)).toBe("fn:string[@key='Title']");
      expect(title.children).toHaveLength(1);
      const titleValue = title.children[0] as ValueSelector;
      expect(titleValue.expression).toBe("fn:string[@key='Title']");

      const quantity = forEachItem.children[1] as FieldItem;
      const quantityJsonField = quantity.field as JsonSchemaField;
      expect(quantityJsonField.key).toBe('Quantity');
      expect(quantityJsonField.type).toEqual(Types.Integer);
      expect(quantityJsonField.getExpression(namespaces)).toBe("fn:number[@key='Quantity']");
      expect(quantity.children).toHaveLength(1);
      const quantityValue = quantity.children[0] as ValueSelector;
      expect(quantityValue.expression).toBe("fn:number[@key='Quantity']");

      const price = forEachItem.children[2] as FieldItem;
      const priceJsonField = price.field as JsonSchemaField;
      expect(priceJsonField.key).toBe('Price');
      expect(priceJsonField.type).toEqual(Types.Numeric);
      expect(priceJsonField.getExpression(namespaces)).toBe("fn:number[@key='Price']");
      expect(price.children).toHaveLength(1);
      const priceValue = price.children[0] as ValueSelector;
      expect(priceValue.expression).toBe("fn:number[@key='Price']");
    });
  });

  describe('serialize()', () => {
    const domParser = new DOMParser();
    const nsResolver: XPathNSResolver = {
      lookupNamespaceURI(prefix: string | null): string | null {
        if (prefix === 'xsl') return NS_XSL;
        if (prefix === 'fn') return NS_XPATH_FUNCTIONS;
        return null;
      },
    };

    it('should serialize JSON mappings', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
      ({ mappingTree } = MappingSerializerService.deserialize(
        getShipOrderJsonXslt(),
        targetDoc,
        mappingTree,
        sourceParameterMap,
      ));
      const xsltString = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xsltString, 'text/xml');

      const outputMethod = xsltDocument
        .evaluate('/xsl:stylesheet/xsl:output/@method', xsltDocument, nsResolver, XPathResult.ANY_TYPE)
        .iterateNext();
      expect(outputMethod?.nodeValue).toBe('text');

      // xsl:param
      const paramOrderSequence = xsltDocument
        .evaluate("/xsl:stylesheet/xsl:param[@name='OrderSequence']", xsltDocument, nsResolver, XPathResult.ANY_TYPE)
        .iterateNext();
      expect(paramOrderSequence).not.toBeNull();
      const paramAccount = xsltDocument
        .evaluate("/xsl:stylesheet/xsl:param[@name='Account']", xsltDocument, nsResolver, XPathResult.ANY_TYPE)
        .iterateNext();
      expect(paramAccount).not.toBeNull();
      const paramCart = xsltDocument
        .evaluate("/xsl:stylesheet/xsl:param[@name='Cart']", xsltDocument, nsResolver, XPathResult.ANY_TYPE)
        .iterateNext();
      expect(paramCart).not.toBeNull();

      // xsl:variable / source param JSON
      const varOrderSequence = xsltDocument
        .evaluate(
          "/xsl:stylesheet/xsl:variable[@name='OrderSequence-x']",
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      expect(varOrderSequence).toBeNull();
      const varAccountSelect = xsltDocument
        .evaluate(
          "/xsl:stylesheet/xsl:variable[@name='Account-x']/@select",
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      expect(varAccountSelect?.nodeValue).toBe('json-to-xml($Account)');
      const varCartSelect = xsltDocument
        .evaluate(
          "/xsl:stylesheet/xsl:variable[@name='Cart-x']/@select",
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      expect(varCartSelect?.nodeValue).toBe('json-to-xml($Cart)');

      // xsl:variable / target JSON
      const varMappedXml = xsltDocument
        .evaluate(
          `/xsl:stylesheet/xsl:variable[@name='${TO_JSON_TARGET_VARIABLE}']`,
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext() as Element;
      expect(varMappedXml).not.toBeNull();
      const rootMap = varMappedXml.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'map')[0];
      expect(rootMap.getAttribute('key')).toBeNull();

      const orderId = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[0];
      expect(orderId.getAttribute('key')).toBe('OrderId');
      const orderIdValueOf = orderId.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(orderIdValueOf.getAttribute('select')).toBe(
        "upper-case(concat('ORD-', $Account-x/fn:map/fn:string[@key='AccountId'], '-', $OrderSequence))",
      );

      const orderPerson = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[1];
      expect(orderPerson.getAttribute('key')).toBe('OrderPerson');
      const orderPersonValueOf = orderPerson.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(orderPersonValueOf.getAttribute('select')).toBe(
        "$Account-x/fn:map/fn:string[@key='AccountId'], ':', $Account-x/fn:map/fn:string[@key='Name']",
      );

      const shipTo = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'map')[0];
      expect(shipTo.getAttribute('key')).toBe('ShipTo');

      const shipToName = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[0];
      expect(shipToName.getAttribute('key')).toBe('Name');
      const nameValueOf = shipToName.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(nameValueOf.getAttribute('select')).toBe("$Account-x/fn:map/fn:string[@key='Name']");

      const shipToStreet = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[1];
      expect(shipToStreet.getAttribute('key')).toBe('Street');
      const streetValueOf = shipToStreet.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(streetValueOf.getAttribute('select')).toBe(
        "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
      );

      const shipToCity = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[2];
      expect(shipToCity.getAttribute('key')).toBe('City');
      const cityValueOf = shipToCity.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(cityValueOf.getAttribute('select')).toBe(
        "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
      );

      const shipToState = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[3];
      expect(shipToState.getAttribute('key')).toBe('State');
      const stateValueOf = shipToState.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(stateValueOf.getAttribute('select')).toBe(
        "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
      );

      const shipToCountry = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[4];
      expect(shipToCountry.getAttribute('key')).toBe('Country');
      const countryValueOf = shipToCountry.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(countryValueOf.getAttribute('select')).toBe(
        "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']",
      );

      const itemArray = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'array')[0];
      expect(itemArray.getAttribute('key')).toBe('Item');
      const forEach = itemArray.getElementsByTagNameNS(NS_XSL, 'for-each')[0];
      expect(forEach.getAttribute('select')).toBe('$Cart-x/fn:array/fn:map');

      const forEachMap = forEach.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'map')[0];
      expect(forEachMap.getAttribute('key')).toBeNull();

      const itemTitle = forEachMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[0];
      expect(itemTitle.getAttribute('key')).toBe('Title');
      const itemTitleValueOf = itemTitle.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(itemTitleValueOf.getAttribute('select')).toBe("fn:string[@key='Title']");

      const itemQuantity = forEachMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'number')[0];
      expect(itemQuantity.getAttribute('key')).toBe('Quantity');
      const itemQuantityValueOf = itemQuantity.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(itemQuantityValueOf.getAttribute('select')).toBe("fn:number[@key='Quantity']");

      const itemPrice = forEachMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'number')[1];
      expect(itemPrice.getAttribute('key')).toBe('Price');
      const itemPriceValueOf = itemPrice.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(itemPriceValueOf.getAttribute('select')).toBe("fn:number[@key='Price']");

      // xsl:template
      const templateValueOfSelect = xsltDocument
        .evaluate(
          "/xsl:stylesheet/xsl:template[@match='/']/xsl:value-of/@select",
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      expect(templateValueOfSelect?.nodeValue).toBe(`xml-to-json($${TO_JSON_TARGET_VARIABLE})`);
    });
  });
});
