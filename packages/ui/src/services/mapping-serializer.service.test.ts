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
      const dom = new DOMParser().parseFromString(empty, 'application/xml');
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
      const dom = new DOMParser().parseFromString(serialized, 'application/xml');
      const xslAttribute = dom
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:attribute',
          dom,
          null,
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext() as Element;
      expect(xslAttribute.getAttribute('name')).toEqual('OrderId');
      const xslValueOf = xslAttribute.getElementsByTagNameNS(NS_XSL, 'value-of').item(0)!;
      expect(xslValueOf.getAttribute('select')).toEqual('/ns0:ShipOrder/@OrderId');
    });

    it('should serialize an element mapping', () => {
      const serialized = MappingSerializerService.serialize([
        {
          sourceFields: [getField(sourceDoc, '/ShipOrder/ShipTo/Name')],
          targetFields: [getField(targetDoc, '/ShipOrder/ShipTo/Name')],
        },
      ] as IMapping[]);
      const dom = new DOMParser().parseFromString(serialized, 'application/xml');
      const xslValueOf = dom
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/ShipTo/Name/xsl:value-of',
          dom,
          null,
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext() as Element;
      expect(xslValueOf.getAttribute('select')).toEqual('/ns0:ShipOrder/ShipTo/Name');
    });

    it('should serialize a container field mapping', () => {
      const serialized = MappingSerializerService.serialize([
        {
          sourceFields: [getField(sourceDoc, '/ShipOrder/Item')],
          targetFields: [getField(targetDoc, '/ShipOrder/Item')],
        },
      ] as IMapping[]);
      const dom = new DOMParser().parseFromString(serialized, 'application/xml');
      const xslCopyOf = dom
        .evaluate(
          '/xsl:stylesheet/xsl:template/ShipOrder/xsl:copy-of',
          dom,
          null,
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
        )
        .iterateNext() as Element;
      expect(xslCopyOf.getAttribute('select')).toEqual('/ns0:ShipOrder/Item');
    });
  });
});
