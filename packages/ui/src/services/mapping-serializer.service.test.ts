import { MappingSerializerService, NS_XSL } from './mapping-serializer.service';
import { IDocument, IField, IMapping } from '../models';
import { DocumentType } from '../models/document';
import * as fs from 'fs';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

const orderXsd = fs.readFileSync(__dirname + '/../../../../test-resources/ShipOrder.xsd').toString();
const sourceDoc = XmlSchemaDocumentService.parseXmlSchema(orderXsd);
sourceDoc.documentType = DocumentType.SOURCE_BODY;
const targetDoc = XmlSchemaDocumentService.parseXmlSchema(orderXsd);
targetDoc.documentType = DocumentType.TARGET_BODY;
const domParser = new DOMParser();
const xsltProcessor = new XSLTProcessor();

function getField(doc: IDocument, path: string) {
  let answer: IField | IDocument = doc;
  const pathSegments = path.split('/');
  for (let i = 1; i < pathSegments.length; i++) {
    const f: IField | undefined = answer.fields.find((f) => f.expression === pathSegments[i]);
    if (!f) {
      throw new Error(`Field ${answer.name} doesn't have a child ${pathSegments[i]}`);
    }
    answer = f;
  }
  return answer;
}

describe('MappingSerializerService', () => {
  it('createNew() should create am empty XSLT document', () => {
    const xslt = MappingSerializerService.createNew();
    const stylesheet = xslt.getElementsByTagNameNS(NS_XSL, 'stylesheet');
    expect(stylesheet.length).toEqual(1);
    expect(stylesheet[0].namespaceURI).toBe(NS_XSL);
    expect(stylesheet[0].localName).toBe('stylesheet');
    const template = xslt.getElementsByTagNameNS(NS_XSL, 'template');
    expect(template.length).toEqual(1);
    expect(template[0].namespaceURI).toBe(NS_XSL);
    expect(template[0].localName).toBe('template');
  });

  describe('serialize()', () => {
    it('should return an empty XSLT document with empty mappings', () => {
      const empty = MappingSerializerService.serialize([]);
      const dom = domParser.parseFromString(empty, 'application/xml');
      const template = dom
        .evaluate('/xsl:stylesheet/xsl:template', dom, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE)
        .iterateNext();
      expect(template).toBeTruthy();
      expect(template!.childNodes.length).toEqual(1);
      expect(template!.childNodes[0].nodeType).toEqual(Node.TEXT_NODE);
    });

    it('should serialize an attribute mapping', () => {
      const serialized = MappingSerializerService.serialize([
        {
          sourceFields: [getField(sourceDoc, '/ShipOrder/@OrderId')],
          targetFields: [getField(targetDoc, '/ShipOrder/@OrderId')],
        },
      ] as IMapping[]);
      const xsltDomDocument = domParser.parseFromString(serialized, 'application/xml');
      const xslAttribute = xsltDomDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:attribute',
          xsltDomDocument,
          null,
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext() as Element;
      expect(xslAttribute.getAttribute('name')).toEqual('OrderId');
      const xslValueOf = xslAttribute.getElementsByTagNameNS(NS_XSL, 'value-of').item(0)!;
      expect(xslValueOf.getAttribute('select')).toEqual('/ns0:ShipOrder/@OrderId');

      const inputString = `<?xml version="1.0" encoding="UTF-8"?>
        <ns0:ShipOrder xmlns:ns0="io.kaoto.datamapper.poc.test" OrderId="3">
          <OrderPerson>foo</OrderPerson>
        </ns0:ShipOrder>`;
      xsltProcessor.importStylesheet(xsltDomDocument);
      const transformed = xsltProcessor.transformToDocument(domParser.parseFromString(inputString, 'application/xml'));
      // jsdom namespace handling is buggy
      const shipOrder = transformed.getElementsByTagName('ShipOrder')[0] as Element;
      const orderId = shipOrder.getAttribute('OrderId');
      expect(orderId).toEqual('3');
      expect(shipOrder.getElementsByTagName('OrderPerson').length).toEqual(0);
    });

    it('should serialize an element mapping', () => {
      const serialized = MappingSerializerService.serialize([
        {
          sourceFields: [getField(sourceDoc, '/ShipOrder/ShipTo/Name')],
          targetFields: [getField(targetDoc, '/ShipOrder/ShipTo/Name')],
        },
      ] as IMapping[]);
      const xsltDomDocument = domParser.parseFromString(serialized, 'application/xml');
      const xslValueOf = xsltDomDocument
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/ShipTo/Name/xsl:value-of',
          xsltDomDocument,
          null,
          XPathResult.ANY_TYPE,
        )
        .iterateNext() as Element;
      expect(xslValueOf.getAttribute('select')).toEqual('/ns0:ShipOrder/ShipTo/Name');

      const inputString = `<?xml version="1.0" encoding="UTF-8"?>
        <ns0:ShipOrder xmlns:ns0="io.kaoto.datamapper.poc.test" OrderId="3">
          <OrderPerson>foo</OrderPerson>
          <ShipTo>
            <Name>bar</Name>
            <Address>somewhere</Address>
          </ShipTo>
        </ns0:ShipOrder>`;
      xsltProcessor.importStylesheet(xsltDomDocument);
      const transformed = xsltProcessor.transformToDocument(domParser.parseFromString(inputString, 'application/xml'));
      // jsdom namespace handling is buggy
      const shipOrder = transformed.getElementsByTagName('ShipOrder')[0];
      expect(shipOrder.getAttribute('OrderId')).toBeNull();
      expect(shipOrder.getElementsByTagName('OrderPerson').length).toEqual(0);
      const shipTo = shipOrder.getElementsByTagName('ShipTo')[0];
      const name = shipTo.getElementsByTagName('Name')[0];
      expect(name.textContent).toEqual('bar');
      expect(shipTo.getElementsByTagName('Address').length).toEqual(0);
    });

    it('should serialize a container field mapping', () => {
      const serialized = MappingSerializerService.serialize([
        {
          sourceFields: [getField(sourceDoc, '/ShipOrder/Item')],
          targetFields: [getField(targetDoc, '/ShipOrder/Item')],
        },
      ] as IMapping[]);
      const xsltDomDocument = domParser.parseFromString(serialized, 'application/xml');
      const xslCopyOf = xsltDomDocument
        .evaluate('/xsl:stylesheet/xsl:template/ShipOrder/xsl:copy-of', xsltDomDocument, null, XPathResult.ANY_TYPE)
        .iterateNext() as Element;
      expect(xslCopyOf.getAttribute('select')).toEqual('/ns0:ShipOrder/Item');

      const inputString = `<?xml version="1.0" encoding="UTF-8"?>
        <ns0:ShipOrder xmlns:ns0="io.kaoto.datamapper.poc.test" OrderId="3">
          <OrderPerson>foo</OrderPerson>
          <ShipTo>
            <Name>bar</Name>
          </ShipTo>
          <Item>
            <Title>some title</Title>
            <NotInSchema>this element is not defined in the schema</NotInSchema>
          </Item>
        </ns0:ShipOrder>`;
      xsltProcessor.importStylesheet(xsltDomDocument);
      const transformed = xsltProcessor.transformToDocument(domParser.parseFromString(inputString, 'application/xml'));
      // jsdom namespace handling is buggy
      const shipOrder = transformed.getElementsByTagName('ShipOrder')[0];
      expect(shipOrder.getAttribute('OrderId')).toBeNull();
      expect(shipOrder.getElementsByTagName('OrderPerson').length).toEqual(0);
      expect(shipOrder.getElementsByTagName('ShipTo').length).toEqual(0);
      const item = shipOrder.getElementsByTagName('Item')[0];
      const title = item.getElementsByTagName('Title')[0];
      expect(title).toBeTruthy();
      const notInSchema = item.getElementsByTagName('NotInSchema')[0];
      expect(notInSchema).toBeTruthy();
      /* This doesn't work with xslt-ts ATM, although it works fine in XSLT Fiddle, i.e. copy nested values.
      expect(title.textContent).toEqual('some title');
      expect(notInSchema.textContent).toEqual('this element is not defined in the schema');
       */
    });
  });
});
