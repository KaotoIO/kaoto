import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';

describe.skip('XML parser', () => {
  describe('fast-xml-parser', () => {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '_attr_',
      preserveOrder: true,
    });

    it('should parse XML schema', () => {
      const orderXsd = fs.readFileSync(__dirname + '/../../../test-resources/ShipOrder.xsd').toString();
      const parsed = parser.parse(orderXsd);
      expect(parsed).toBeDefined();
    });

    it('should parse XML document', () => {
      const orderXml = fs.readFileSync(__dirname + '/../../../test-resources/ExampleOrder.xml').toString();
      const parsed = parser.parse(orderXml);
      expect(parsed).toBeDefined();
    });
  });

  describe('DOMParser', () => {
    const parser = new DOMParser();

    it('should parse XML schema', () => {
      const orderXsd = fs.readFileSync(__dirname + '/../../../test-resources/ShipOrder.xsd').toString();
      const xmlDoc = parser.parseFromString(orderXsd, 'text/xml');
      expect(xmlDoc).toBeDefined();
      const schema = xmlDoc.getElementsByTagName('xs:schema')[0];
      console.log(
        `nodeName=${schema!.nodeName}, localName=${schema!.localName}, namespaceURI=${schema!.namespaceURI}, prefix=${schema.prefix}`,
      );
      const children = schema.childNodes;
      children.forEach((v) => {
        const el = v as Element;
        console.log(
          `nodeName=${el!.nodeName}, localName=${el!.localName}, namespaceURI=${el!.namespaceURI}, prefix=${el.prefix}`,
        );
      });
    });

    it('should parse XML document', () => {
      const orderXml = fs.readFileSync(__dirname + '/../../../test-resources/ExampleOrder.xml').toString();
      const xmlDoc = parser.parseFromString(orderXml, 'text/xml');
      expect(xmlDoc).toBeDefined();
    });
  });
});
