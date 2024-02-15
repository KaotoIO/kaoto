import { XMLParser } from 'fast-xml-parser';
import { ATTRIBUTE_PREFIX } from './Constants';

export function parseDocument(content: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(content, 'text/xml');
}

export function buildXmlDocument(content: string): XmlDocument {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: ATTRIBUTE_PREFIX });
  const parsed = parser.parse(content);
  return new XmlDocument(parsed);
}

export abstract class XmlNode {
  protected nodes: XmlNode[] = [];
  constructor(parsed: object) {
    this.nodes = Object.entries(parsed).map(([name, value]) => {
      if (name?.startsWith(ATTRIBUTE_PREFIX)) {
        nodes.push(this.createAttributeNode(value));
      }
    });
  }

  getFirstChild(): XmlNode {}

  getFirstChildElementNS(uri: string) {
    const child = this.getFirstChild();
    while (child != null) {
      if (child.getNodeType === Node.ELEMENT_NODE) {
        const childURI = child.getNamespaceURI();
        if (childURI?.equals(uri)) {
          return child as XmlElement;
        }
      }
      child = child.getNextSibling();
    }
  }
}

export class XmlDocument extends XmlNode {
  constructor(parsed: object) {
    super(parsed);
  }

  getDocumentElement(): XmlElement {
    return new XmlElement(Object.values(this.parsed)[0]);
  }
}

export class XmlElement extends XmlNode {
  constructor(parsed: object) {
    super(parsed);
  }
}
