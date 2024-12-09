/**
 * Class for XML Path Language (XPath) expressions. Represents the World Wide Web Consortium (W3C) selector
 * element. The World Wide Web Consortium (W3C) field element is a collection of XmlSchemaXPath classes.
 */
import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';

export class XmlSchemaXPath extends XmlSchemaAnnotated {
  xpath: string | null = null;

  getXPath() {
    return this.xpath;
  }

  setXPath(xpathString: string) {
    this.xpath = xpathString;
  }
}
