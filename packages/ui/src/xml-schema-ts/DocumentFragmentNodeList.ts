export class DocumentFragmentNodeList implements NodeList {
  private nodes: Node[] = [];
  private fragment?: DocumentFragment;
  length: number;

  /**
   * Create a list of the children of a given node that are elements with a specified qualified name.
   *
   * @param parentNode node from which to copy children.
   * @param filterUri Namespace URI of children to copy.
   * @param filterLocal Local name of children to copy.
   */
  constructor(parentNode: Node, filterUri?: string, filterLocal?: string) {
    this.length = 0;
    if (!parentNode.ownerDocument) {
      throw new Error('Could not access the owner Document');
    }
    this.fragment = parentNode.ownerDocument.createDocumentFragment();
    for (let child = parentNode.firstChild; child != null; child = child.nextSibling) {
      if (filterUri == null && filterLocal == null) {
        this.nodes.push(this.fragment.appendChild(child.cloneNode(true)));
        continue;
      }
      if (child.nodeType == Node.ELEMENT_NODE) {
        const childElement = child as Element;
        if (childElement.namespaceURI === filterUri && childElement.localName === filterLocal) {
          this.nodes.push(this.fragment.appendChild(child.cloneNode(true)));
        }
      }
    }
    this.length = this.nodes.length;
  }

  item(index: number) {
    if (this.nodes == null) {
      return null;
    } else {
      return this.nodes[index];
    }
  }

  /**
   * Java DOM doesn't have followings, but required in TypeScript
   */

  [index: number]: Node;
  forEach(_callbackfn: (value: Node, key: number, parent: NodeList) => void, _thisArg?: object): void {
    throw new Error('Method not implemented.');
  }
  entries(): IterableIterator<[number, Node]> {
    throw new Error('Method not implemented.');
  }
  keys(): IterableIterator<number> {
    throw new Error('Method not implemented.');
  }
  values(): IterableIterator<Node> {
    throw new Error('Method not implemented.');
  }
  [Symbol.iterator](): IterableIterator<Node> {
    throw new Error('Method not implemented.');
  }
}
