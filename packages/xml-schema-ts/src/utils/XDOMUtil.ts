/**
 * Merging DOMUtil and XDOMUtil. In TypeScript, inheritance and method overloading
 * is different from Java, which caused a problem on these relationship.
 */
export class XDOMUtil {
  /**
   * Finds and returns the next sibling element node.
   */
  static getNextSiblingElement(node: Node): Element | null {
    // search for node
    let sibling = node.nextSibling;
    while (sibling != null) {
      if (sibling.nodeType == Node.ELEMENT_NODE) {
        return sibling as Element;
      }
      sibling = sibling.nextSibling;
    }
    // not found
    return null;
  } // getNextSiblingElement(Node):Element

  /**
   * Finds and returns the first child node with the given qualified name.
   */
  static getFirstChildElementNS(parent: Node, uri: string, localpart?: string): Element | null {
    // search for node
    let child = parent.firstChild;
    while (child != null) {
      if (child.nodeType == Node.ELEMENT_NODE) {
        const childElement = child as Element;
        const childURI = childElement.namespaceURI;
        if (childURI != null && childURI === uri) {
          if (localpart == null || childElement.localName === localpart) {
            return childElement;
          }
        }
      }
      child = child.nextSibling;
    }
    // not found
    return null;
  } // getFirstChildElementNS(Node,String,String):Element

  /**
   * Finds and returns the next sibling node with the given qualified name.
   */
  static getNextSiblingElementByNamesNS(node: Node, elemNames: string[][]) {
    // search for node
    let sibling = node.nextSibling;
    while (sibling != null) {
      if (sibling.nodeType == Node.ELEMENT_NODE) {
        const siblingElement = sibling as Element;
        for (const elemName of elemNames) {
          const uri = siblingElement.namespaceURI;
          if (uri != null && uri === elemName[0] && siblingElement.localName === elemName[1]) {
            return siblingElement;
          }
        }
      }
      sibling = sibling.nextSibling;
    }
    // not found
    return null;
  } // getNextSiblingdElementNS(Node,String[][]):Element

  /**
   * Finds and returns the next sibling node with the given qualified name.
   */
  static getNextSiblingElementNS(node: Node, uri: string, localpart?: string) {
    // search for node
    let sibling = node.nextSibling;
    while (sibling != null) {
      if (sibling.nodeType == Node.ELEMENT_NODE) {
        const siblingElement = sibling as Element;
        const siblingURI = siblingElement.namespaceURI;
        if (siblingURI != null && siblingURI === uri && (localpart == null || siblingElement.localName === localpart)) {
          return siblingElement;
        }
      }
      sibling = sibling.nextSibling;
    }
    // not found
    return null;
  } // getNextSiblingdElementNS(Node,String,String):Element
}
