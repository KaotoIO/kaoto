import type { NamespacePrefixList } from './NamespacePrefixList';
import { NULL_NS_URI, XML_NS_PREFIX, XML_NS_URI, XMLNS_ATTRIBUTE, XMLNS_ATTRIBUTE_NS_URI } from '../constants';
import { PrefixCollector } from './PrefixCollector';

export class NodeNamespaceContext implements NamespacePrefixList {
  private prefixes?: string[];

  private constructor(private declarations: Record<string, string>) {}

  static getNamespaceContext(pNode: Node): NodeNamespaceContext {
    const declarations: Record<string, string> = {};
    PrefixCollector.searchAllPrefixDeclarations(pNode, (pPrefix: string, pNamespaceURI: string) => {
      declarations[pPrefix] = pNamespaceURI;
    });
    return new NodeNamespaceContext(declarations);
  }

  getDeclaredPrefixes(): string[] {
    if (this.prefixes == null) {
      this.prefixes = Object.keys(this.declarations);
    }
    return this.prefixes;
  }

  getNamespaceURI(pPrefix: string): string {
    if (pPrefix == null) {
      throw new Error('Prefix cannot be null');
    }
    if (XML_NS_PREFIX === pPrefix) {
      return XML_NS_URI;
    }
    if (XMLNS_ATTRIBUTE === pPrefix) {
      return XMLNS_ATTRIBUTE_NS_URI;
    }
    const uri = this.declarations[pPrefix];
    return uri == null ? NULL_NS_URI : uri;
  }

  getPrefix(pNamespaceURI: string): string {
    if (pNamespaceURI == null) {
      throw new Error('Namespace URI cannot be null');
    }
    if (XML_NS_URI === pNamespaceURI) {
      return XML_NS_PREFIX;
    }
    if (XMLNS_ATTRIBUTE_NS_URI === pNamespaceURI) {
      return XMLNS_ATTRIBUTE;
    }
    const found = Object.entries(this.declarations).find((entry) => entry[1] === pNamespaceURI);
    return found ? found[0] : '';
  }

  getPrefixes(pNamespaceURI: string): string[] {
    if (pNamespaceURI == null) {
      throw new Error('Namespace URI cannot be null');
    }
    if (XML_NS_URI === pNamespaceURI) {
      return [XML_NS_PREFIX];
    }
    if (XMLNS_ATTRIBUTE_NS_URI === pNamespaceURI) {
      return [XMLNS_ATTRIBUTE];
    }
    return Object.entries(this.declarations)
      .filter((entry) => entry[1] === pNamespaceURI)
      .map((entry) => entry[0]);
  }
}
