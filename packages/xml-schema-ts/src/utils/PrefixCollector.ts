import { DEFAULT_NS_PREFIX, XMLNS_ATTRIBUTE, XMLNS_ATTRIBUTE_NS_URI } from '../constants';

export class PrefixCollector {
  static searchLocalPrefixDeclarations(
    pNode: Node,
    declarePrefix: (pPrefix: string, pNamespaceURI: string) => void,
  ): void {
    const type = pNode.nodeType;
    if (type === Node.ELEMENT_NODE || type === Node.DOCUMENT_NODE) {
      const map = (pNode as Element).attributes;
      for (let i = 0; map != null && i < map.length; i++) {
        const attr = map.item(i);
        const uri = attr?.namespaceURI;
        if (XMLNS_ATTRIBUTE_NS_URI === uri) {
          const localName = attr?.localName;
          const prefix = XMLNS_ATTRIBUTE === localName ? DEFAULT_NS_PREFIX : localName;
          declarePrefix(prefix!, attr!.nodeValue!);
        }
      }
    }
  }

  static searchAllPrefixDeclarations(
    pNode: Node,
    declarePrefix: (pPrefix: string, pNamespaceURI: string) => void,
  ): void {
    const parent = pNode.parentNode;
    if (parent != null) {
      PrefixCollector.searchAllPrefixDeclarations(parent, declarePrefix);
    }
    PrefixCollector.searchLocalPrefixDeclarations(pNode, declarePrefix);
  }
}
