import {
  BODY_DOCUMENT_ID,
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
} from '../models/datamapper';
import { MappingSerializerService } from './mapping-serializer.service';
import {
  accountJsonSchema,
  cartJsonSchema,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
} from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/xslt';
import { TO_JSON_TARGET_VARIABLE } from './mapping-serializer-json-addon';

describe('MappingSerializerService / JSON', () => {
  const accountParamDoc = JsonSchemaDocumentService.createJsonSchemaDocument(
    DocumentType.PARAM,
    'Account',
    accountJsonSchema,
  );
  const cartParamDoc = JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.PARAM, 'Cart', cartJsonSchema);
  const orderSequenceParamDoc = new PrimitiveDocument(DocumentType.PARAM, 'OrderSequence');
  const sourceParameterMap = new Map<string, IDocument>([
    ['OrderSequence', orderSequenceParamDoc],
    ['Account', accountParamDoc],
    ['Cart', cartParamDoc],
  ]);
  const targetDoc = JsonSchemaDocumentService.createJsonSchemaDocument(
    DocumentType.TARGET_BODY,
    'ShipOrder',
    shipOrderJsonSchema,
  );

  describe('deserialize()', () => {
    it('should deserialize XSLT', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
      mappingTree = MappingSerializerService.deserialize(shipOrderJsonXslt, targetDoc, mappingTree, sourceParameterMap);
      expect(mappingTree.children.length).toBe(1);
      const root = mappingTree.children[0] as FieldItem;
      expect(root.field.name).toEqual('');
      expect(root.field.type).toEqual(Types.Container);
      expect(root.field.expression).toEqual('xf:map');
      expect(root.children.length).toBe(4);

      const orderId = root.children[0] as FieldItem;
      expect(orderId.field.name).toEqual('OrderId');
      expect(orderId.field.type).toEqual(Types.String);
      expect(orderId.field.expression).toEqual("xf:string[@key='OrderId']");
      expect(orderId.children.length).toBe(1);
      const orderIdValue = orderId.children[0] as ValueSelector;
      expect(orderIdValue.expression).toEqual(
        "upper-case(concat('ORD-', $Account-x/xf:map/xf:string[@key='AccountId'], '-', $OrderSequence))",
      );

      const orderPerson = root.children[1] as FieldItem;
      expect(orderPerson.field.name).toEqual('OrderPerson');
      expect(orderPerson.field.type).toEqual(Types.String);
      expect(orderPerson.field.expression).toEqual("xf:string[@key='OrderPerson']");

      const shipTo = root.children[2] as FieldItem;
      expect(shipTo.field.name).toEqual('ShipTo');
      expect(shipTo.field.type).toEqual(Types.Container);
      expect(shipTo.field.expression).toEqual("xf:map[@key='ShipTo']");
      expect(shipTo.children.length).toBe(5);

      const shipToName = shipTo.children[0] as FieldItem;
      expect(shipToName.field.name).toEqual('Name');
      expect(shipToName.field.type).toEqual(Types.String);
      expect(shipToName.field.expression).toEqual("xf:string[@key='Name']");
      expect(shipToName.children.length).toBe(1);
      const shipToNameValue = shipToName.children[0] as ValueSelector;
      expect(shipToNameValue.expression).toEqual("$Account-x/xf:map/xf:string[@key='Name']");

      const shipToStreet = shipTo.children[1] as FieldItem;
      expect(shipToStreet.field.name).toEqual('Street');
      expect(shipToStreet.field.type).toEqual(Types.String);
      expect(shipToStreet.field.expression).toEqual("xf:string[@key='Street']");
      expect(shipToStreet.children.length).toBe(1);
      const shipToStreetValue = shipToStreet.children[0] as ValueSelector;
      expect(shipToStreetValue.expression).toEqual("$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='Street']");

      const shipToCity = shipTo.children[2] as FieldItem;
      expect(shipToCity.field.name).toEqual('City');
      expect(shipToCity.field.type).toEqual(Types.String);
      expect(shipToCity.field.expression).toEqual("xf:string[@key='City']");
      expect(shipToCity.children.length).toBe(1);
      const shipToCityValue = shipToCity.children[0] as ValueSelector;
      expect(shipToCityValue.expression).toEqual("$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='City']");

      const shipToState = shipTo.children[3] as FieldItem;
      expect(shipToState.field.name).toEqual('State');
      expect(shipToState.field.type).toEqual(Types.String);
      expect(shipToState.field.expression).toEqual("xf:string[@key='State']");
      expect(shipToState.children.length).toBe(1);
      const shipToStateValue = shipToState.children[0] as ValueSelector;
      expect(shipToStateValue.expression).toEqual("$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='State']");

      const shipToCountry = shipTo.children[4] as FieldItem;
      expect(shipToCountry.field.name).toEqual('Country');
      expect(shipToCountry.field.type).toEqual(Types.String);
      expect(shipToCountry.field.expression).toEqual("xf:string[@key='Country']");
      expect(shipToCountry.children.length).toBe(1);
      const shipToCountryValue = shipToCountry.children[0] as ValueSelector;
      expect(shipToCountryValue.expression).toEqual(
        "$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='Country']",
      );

      const item = root.children[3] as FieldItem;
      expect(item.field.name).toEqual('Item');
      expect(item.field.type).toEqual(Types.Array);
      expect(item.field.expression).toEqual("xf:array[@key='Item']");
      expect(item.children.length).toBe(1);

      const forEach = item.children[0] as ForEachItem;
      expect(forEach.expression).toEqual('$Cart-x/xf:array/xf:map');
      expect(forEach.children.length).toBe(1);

      const forEachItem = forEach.children[0] as FieldItem;
      expect(forEachItem.field.name).toEqual('');
      expect(forEachItem.field.type).toEqual(Types.Container);
      expect(forEachItem.field.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
      expect(forEachItem.field.expression).toEqual('xf:map');
      expect(forEachItem.children.length).toBe(3);

      const title = forEachItem.children[0] as FieldItem;
      expect(title.field.name).toEqual('Title');
      expect(title.field.type).toEqual(Types.String);
      expect(title.field.expression).toEqual("xf:string[@key='Title']");
      expect(title.children.length).toBe(1);
      const titleValue = title.children[0] as ValueSelector;
      expect(titleValue.expression).toEqual("xf:string[@key='Title']");

      const quantity = forEachItem.children[1] as FieldItem;
      expect(quantity.field.name).toEqual('Quantity');
      expect(quantity.field.type).toEqual(Types.Numeric);
      expect(quantity.field.expression).toEqual("xf:number[@key='Quantity']");
      expect(quantity.children.length).toBe(1);
      const quantityValue = quantity.children[0] as ValueSelector;
      expect(quantityValue.expression).toEqual("xf:number[@key='Quantity']");

      const price = forEachItem.children[2] as FieldItem;
      expect(price.field.name).toEqual('Price');
      expect(price.field.type).toEqual(Types.Numeric);
      expect(price.field.expression).toEqual("xf:number[@key='Price']");
      expect(price.children.length).toBe(1);
      const priceValue = price.children[0] as ValueSelector;
      expect(priceValue.expression).toEqual("xf:number[@key='Price']");
    });
  });

  describe('serialize()', () => {
    const domParser = new DOMParser();
    const nsResolver: XPathNSResolver = {
      lookupNamespaceURI(prefix: string | null): string | null {
        if (prefix === 'xsl') return NS_XSL;
        if (prefix === 'xf') return NS_XPATH_FUNCTIONS;
        return null;
      },
    };

    it('should serialize JSON mappings', () => {
      let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
      mappingTree = MappingSerializerService.deserialize(shipOrderJsonXslt, targetDoc, mappingTree, sourceParameterMap);
      const xsltString = MappingSerializerService.serialize(mappingTree, sourceParameterMap);
      const xsltDocument = domParser.parseFromString(xsltString, 'text/xml');

      const outputMethod = xsltDocument
        .evaluate('/xsl:stylesheet/xsl:output/@method', xsltDocument, nsResolver, XPathResult.ANY_TYPE)
        .iterateNext();
      expect(outputMethod?.nodeValue).toEqual('text');

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
      expect(varAccountSelect?.nodeValue).toEqual('json-to-xml($Account)');
      const varCartSelect = xsltDocument
        .evaluate(
          "/xsl:stylesheet/xsl:variable[@name='Cart-x']/@select",
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      expect(varCartSelect?.nodeValue).toEqual('json-to-xml($Cart)');

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
      expect(orderId.getAttribute('key')).toEqual('OrderId');
      const orderIdValueOf = orderId.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(orderIdValueOf.getAttribute('select')).toEqual(
        "upper-case(concat('ORD-', $Account-x/xf:map/xf:string[@key='AccountId'], '-', $OrderSequence))",
      );

      const orderPerson = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[1];
      expect(orderPerson.getAttribute('key')).toEqual('OrderPerson');
      const orderPersonValueOf = orderPerson.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(orderPersonValueOf.getAttribute('select')).toEqual(
        "$Account-x/xf:map/xf:string[@key='AccountId'], ':', $Account-x/xf:map/xf:string[@key='Name']",
      );

      const shipTo = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'map')[0];
      expect(shipTo.getAttribute('key')).toEqual('ShipTo');

      const shipToName = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[0];
      expect(shipToName.getAttribute('key')).toEqual('Name');
      const nameValueOf = shipToName.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(nameValueOf.getAttribute('select')).toEqual("$Account-x/xf:map/xf:string[@key='Name']");

      const shipToStreet = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[1];
      expect(shipToStreet.getAttribute('key')).toEqual('Street');
      const streetValueOf = shipToStreet.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(streetValueOf.getAttribute('select')).toEqual(
        "$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='Street']",
      );

      const shipToCity = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[2];
      expect(shipToCity.getAttribute('key')).toEqual('City');
      const cityValueOf = shipToCity.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(cityValueOf.getAttribute('select')).toEqual(
        "$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='City']",
      );

      const shipToState = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[3];
      expect(shipToState.getAttribute('key')).toEqual('State');
      const stateValueOf = shipToState.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(stateValueOf.getAttribute('select')).toEqual(
        "$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='State']",
      );

      const shipToCountry = shipTo.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[4];
      expect(shipToCountry.getAttribute('key')).toEqual('Country');
      const countryValueOf = shipToCountry.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(countryValueOf.getAttribute('select')).toEqual(
        "$Account-x/xf:map/xf:map[@key='Address']/xf:string[@key='Country']",
      );

      const itemArray = rootMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'array')[0];
      expect(itemArray.getAttribute('key')).toEqual('Item');
      const forEach = itemArray.getElementsByTagNameNS(NS_XSL, 'for-each')[0];
      expect(forEach.getAttribute('select')).toEqual('$Cart-x/xf:array/xf:map');

      const forEachMap = forEach.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'map')[0];
      expect(forEachMap.getAttribute('key')).toBeNull();

      const itemTitle = forEachMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'string')[0];
      expect(itemTitle.getAttribute('key')).toEqual('Title');
      const itemTitleValueOf = itemTitle.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(itemTitleValueOf.getAttribute('select')).toEqual("xf:string[@key='Title']");

      const itemQuantity = forEachMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'number')[0];
      expect(itemQuantity.getAttribute('key')).toEqual('Quantity');
      const itemQuantityValueOf = itemQuantity.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(itemQuantityValueOf.getAttribute('select')).toEqual("xf:number[@key='Quantity']");

      const itemPrice = forEachMap.getElementsByTagNameNS(NS_XPATH_FUNCTIONS, 'number')[1];
      expect(itemPrice.getAttribute('key')).toEqual('Price');
      const itemPriceValueOf = itemPrice.getElementsByTagNameNS(NS_XSL, 'value-of')[0];
      expect(itemPriceValueOf.getAttribute('select')).toEqual("xf:number[@key='Price']");

      // xsl:template
      const templateValueOfSelect = xsltDocument
        .evaluate(
          "/xsl:stylesheet/xsl:template[@match='/']/xsl:value-of/@select",
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      expect(templateValueOfSelect?.nodeValue).toEqual(`xml-to-json($${TO_JSON_TARGET_VARIABLE})`);
    });
  });
});
